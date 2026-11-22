import rateLimit from 'express-rate-limit';

const make = (windowMin: number, max: number, message: string) =>
  rateLimit({ windowMs: windowMin * 60_000, limit: max, standardHeaders: 'draft-7', legacyHeaders: false, message: { message } });

export const globalLimiter = make(15, 400, 'Too many requests. Please slow down.');
export const authLimiter = make(15, 15, 'Too many attempts. Try again in a few minutes.');
export const otpLimiter = make(15, 6, 'Too many code requests. Try again later.');
export const orderLimiter = make(60, 20, 'Too many orders from this network. Try again later.');
export const contactLimiter = make(60, 6, 'Too many messages. Try again later.');
