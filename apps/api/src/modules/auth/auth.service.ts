import argon2 from 'argon2';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { Prisma, User } from '@prisma/client';
import { env } from '../../config/env';
import { prisma } from '../../lib/prisma';
import { tryNormalizePhone } from '../../lib/phone';
import { sendOtp } from '../../lib/notifier';
import { AppError } from '../../utils/errors';

const sha256 = (v: string) => crypto.createHash('sha256').update(v).digest('hex');
const hmac = (v: string) => crypto.createHmac('sha256', env.OTP_HMAC_SECRET).update(v).digest('hex');
const safeEqual = (a: string, b: string) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;
const REFRESH_DAYS = 30;

export const publicUser = (u: User) => ({ id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role });

async function findByIdentifier(identifier: string) {
  if (identifier.includes('@')) return prisma.user.findUnique({ where: { email: identifier.toLowerCase() } });
  const phone = tryNormalizePhone(identifier);
  return phone ? prisma.user.findUnique({ where: { phone } }) : null;
}

async function issueOtp(user: User) {
  const channel = user.email ? 'EMAIL' : 'SMS';
  const to = (user.email ?? user.phone)!;
  const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0'); // CSPRNG, not Math.random
  await prisma.otpCode.updateMany({ where: { userId: user.id, consumedAt: null }, data: { consumedAt: new Date() } });
  await prisma.otpCode.create({
    data: { userId: user.id, channel, codeHash: hmac(`${user.id}:${code}`), expiresAt: new Date(Date.now() + 10 * 60_000) },
  });
  await sendOtp(channel, to, code);
}

/** Always resolves the same way whether or not the account exists (prevents account enumeration). */
export async function register(i: { name: string; email?: string; phone?: string; password: string }) {
  const or: Prisma.UserWhereInput[] = [];
  if (i.email) or.push({ email: i.email });
  if (i.phone) or.push({ phone: i.phone });
  const existing = await prisma.user.findFirst({ where: { OR: or } });
  if (existing) {
    if (!existing.isVerified) await issueOtp(existing);
    return;
  }
  try {
    const passwordHash = await argon2.hash(i.password, { type: argon2.argon2id });
    const user = await prisma.user.create({ data: { name: i.name, email: i.email, phone: i.phone, passwordHash } });
    await issueOtp(user);
  } catch (e) {
    if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')) throw e;
  }
}

export async function resend(identifier: string) {
  const user = await findByIdentifier(identifier);
  if (user && !user.isVerified) await issueOtp(user);
}

export async function verify(identifier: string, code: string, ua?: string) {
  const bad = new AppError(400, 'Invalid or expired code');
  const user = await findByIdentifier(identifier);
  if (!user) throw bad;
  const otp = await prisma.otpCode.findFirst({
    where: { userId: user.id, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  });
  if (!otp || otp.attempts >= 5) throw bad;
  await prisma.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
  if (!safeEqual(otp.codeHash, hmac(`${user.id}:${code}`))) throw bad;
  const [, verified] = await prisma.$transaction([
    prisma.otpCode.update({ where: { id: otp.id }, data: { consumedAt: new Date() } }),
    prisma.user.update({ where: { id: user.id }, data: { isVerified: true } }),
  ]);
  return issueSession(verified, ua);
}

let dummyHash: Promise<string> | undefined;

export async function login(identifier: string, password: string, ua?: string) {
  const fail = new AppError(401, 'Incorrect email/phone or password');
  const user = await findByIdentifier(identifier);
  // Hash even when the user is unknown so response time does not reveal valid accounts.
  dummyHash ??= argon2.hash('timing-equaliser', { type: argon2.argon2id });
  const ok = await argon2.verify(user?.passwordHash ?? (await dummyHash), password).catch(() => false);
  if (!user) throw fail;
  if (user.lockedUntil && user.lockedUntil > new Date()) throw new AppError(429, 'Too many failed attempts. Try again later.');
  if (!ok) {
    const failed = user.failedLogins + 1;
    await prisma.user.update({
      where: { id: user.id },
      data: failed >= MAX_FAILED_LOGINS
        ? { failedLogins: 0, lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60_000) }
        : { failedLogins: failed },
    });
    throw fail;
  }
  if (!user.isVerified) {
    await issueOtp(user);
    throw new AppError(403, 'Please verify your account. We sent you a new code.', 'NOT_VERIFIED');
  }
  await prisma.user.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null } });
  return issueSession(user, ua);
}

async function issueSession(user: User, ua?: string) {
  const accessToken = jwt.sign({ role: user.role }, env.JWT_ACCESS_SECRET, { subject: user.id, expiresIn: '15m', algorithm: 'HS256' });
  const refreshToken = crypto.randomBytes(48).toString('base64url');
  await prisma.refreshToken.create({
    data: { userId: user.id, tokenHash: sha256(refreshToken), userAgent: ua?.slice(0, 200), expiresAt: new Date(Date.now() + REFRESH_DAYS * 86_400_000) },
  });
  return { accessToken, refreshToken, user: publicUser(user) };
}

/** Rotating refresh tokens. Re-use of an old token means theft: revoke the whole family. */
export async function refresh(raw: string | undefined, ua?: string) {
  if (!raw) throw new AppError(401, 'Session expired');
  const row = await prisma.refreshToken.findUnique({ where: { tokenHash: sha256(raw) }, include: { user: true } });
  if (!row) throw new AppError(401, 'Session expired');
  if (row.revokedAt) {
    await prisma.refreshToken.updateMany({ where: { userId: row.userId, revokedAt: null }, data: { revokedAt: new Date() } });
    throw new AppError(401, 'Session expired');
  }
  if (row.expiresAt < new Date()) throw new AppError(401, 'Session expired');
  await prisma.refreshToken.update({ where: { id: row.id }, data: { revokedAt: new Date() } });
  return issueSession(row.user, ua);
}

export async function logout(raw?: string) {
  if (raw) await prisma.refreshToken.updateMany({ where: { tokenHash: sha256(raw), revokedAt: null }, data: { revokedAt: new Date() } });
}

export const me = (id: string) =>
  prisma.user.findUniqueOrThrow({ where: { id } }).then(publicUser);
