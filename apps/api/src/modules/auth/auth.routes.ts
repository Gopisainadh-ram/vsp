import { CookieOptions, Router } from 'express';
import { env } from '../../config/env';
import { authenticate } from '../../middleware/auth';
import { authLimiter, otpLimiter } from '../../middleware/rateLimit';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/errors';
import * as svc from './auth.service';
import { loginSchema, registerSchema, resendSchema, verifySchema } from './auth.schemas';

const COOKIE = 'vsp_rt';
// httpOnly: JS (and therefore XSS) cannot read it. SameSite=Strict + path scope: it is only sent to /api/auth.
const cookieOpts: CookieOptions = { httpOnly: true, secure: env.COOKIE_SECURE, sameSite: 'strict', path: '/api/auth', maxAge: 30 * 86_400_000 };

const router = Router();
const session = (res: any, s: Awaited<ReturnType<typeof svc.login>>) => {
  res.cookie(COOKIE, s.refreshToken, cookieOpts);
  res.json({ accessToken: s.accessToken, user: s.user });
};

router.post('/register', authLimiter, validate({ body: registerSchema }), asyncHandler(async (req, res) => {
  await svc.register(req.body);
  res.status(202).json({ message: 'If the details are valid, a verification code has been sent.' });
}));

router.post('/resend', otpLimiter, validate({ body: resendSchema }), asyncHandler(async (req, res) => {
  await svc.resend(req.body.identifier);
  res.status(202).json({ message: 'If an unverified account exists, a new code has been sent.' });
}));

router.post('/verify', authLimiter, validate({ body: verifySchema }), asyncHandler(async (req, res) => {
  session(res, await svc.verify(req.body.identifier, req.body.code, req.headers['user-agent']));
}));

router.post('/login', authLimiter, validate({ body: loginSchema }), asyncHandler(async (req, res) => {
  session(res, await svc.login(req.body.identifier, req.body.password, req.headers['user-agent']));
}));

router.post('/refresh', authLimiter, asyncHandler(async (req, res) => {
  session(res, await svc.refresh(req.cookies?.[COOKIE], req.headers['user-agent']));
}));

router.post('/logout', asyncHandler(async (req, res) => {
  await svc.logout(req.cookies?.[COOKIE]);
  res.clearCookie(COOKIE, { ...cookieOpts, maxAge: undefined });
  res.status(204).end();
}));

router.get('/me', authenticate, asyncHandler(async (req, res) => { res.json(await svc.me(req.user!.id)); }));

export default router;
