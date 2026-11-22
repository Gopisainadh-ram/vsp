import { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { Permission, ROLE_PERMISSIONS } from '../config/permissions';
import { AppError } from '../utils/errors';

function readUser(header?: string) {
  if (!header?.startsWith('Bearer ')) return null;
  try {
    // Pin the algorithm: prevents "alg: none" / algorithm confusion attacks (A02/A07).
    const p = jwt.verify(header.slice(7), env.JWT_ACCESS_SECRET, { algorithms: ['HS256'] });
    if (typeof p === 'string' || !p.sub) return null;
    return { id: p.sub, role: p.role === 'ADMIN' ? ('ADMIN' as const) : ('USER' as const) };
  } catch {
    return null;
  }
}

export const authenticate: RequestHandler = (req, _res, next) => {
  const user = readUser(req.headers.authorization);
  if (!user) throw new AppError(401, 'Please sign in to continue');
  req.user = user;
  next();
};

export const optionalAuth: RequestHandler = (req, _res, next) => {
  const user = readUser(req.headers.authorization);
  if (user) req.user = user;
  next();
};

export const requirePermission =
  (permission: Permission): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) throw new AppError(401, 'Please sign in to continue');
    if (!ROLE_PERMISSIONS[req.user.role].includes(permission)) throw new AppError(403, 'You do not have access to this');
    next();
  };

export { readUser };
