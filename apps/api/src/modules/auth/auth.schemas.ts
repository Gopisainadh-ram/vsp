import { z } from 'zod';
import { tryNormalizePhone } from '../../lib/phone';

export const phoneSchema = z.string().trim().transform((v, ctx) => {
  const n = tryNormalizePhone(v);
  if (!n) { ctx.addIssue({ code: 'custom', message: 'Enter a valid phone number' }); return z.NEVER; }
  return n;
});

const password = z.string().min(10, 'Use at least 10 characters').max(128);

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email().max(254).optional(),
  phone: phoneSchema.optional(),
  password,
}).refine((v) => v.email || v.phone, { message: 'Provide an email or a phone number', path: ['email'] });

export const verifySchema = z.object({ identifier: z.string().trim().min(3).max(254), code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code') });
export const resendSchema = z.object({ identifier: z.string().trim().min(3).max(254) });
export const loginSchema = z.object({ identifier: z.string().trim().min(3).max(254), password: z.string().min(1).max(128) });
