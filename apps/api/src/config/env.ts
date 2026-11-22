import { z } from 'zod';

// Fail fast at boot: a mis-configured server must never start (OWASP A05).
const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 chars'),
  OTP_HMAC_SECRET: z.string().min(32, 'OTP_HMAC_SECRET must be at least 32 chars'),
  CORS_ORIGINS: z.string().default('http://localhost:4200'),
  COOKIE_SECURE: z.enum(['true', 'false']).default('false').transform((v) => v === 'true'),
  UPLOAD_DIR: z.string().default('./uploads'),
  WHATSAPP_ADMIN_NUMBER: z.string().regex(/^\d{10,15}$/, 'digits only, with country code'),
  WHATSAPP_TOKEN: z.string().optional().transform((v) => v || undefined),
  WHATSAPP_PHONE_ID: z.string().regex(/^\d+$/).optional().or(z.literal('')).transform((v) => v || undefined),
  SMTP_URL: z.string().optional().transform((v) => v || undefined),
  MAIL_FROM: z.string().default('VSP <no-reply@vspoils.com>'),
});

export const env = schema.parse(process.env);
export const corsOrigins = env.CORS_ORIGINS.split(',').map((s) => s.trim());
export const isProd = env.NODE_ENV === 'production';
