import nodemailer from 'nodemailer';
import { env, isProd } from '../config/env';
import { logger } from './logger';
import { AppError } from '../utils/errors';

const mailer = env.SMTP_URL ? nodemailer.createTransport(env.SMTP_URL) : null;

/** Delivers a one-time code. Add an SMS provider (MSG91, Twilio, ...) in the SMS branch. */
export async function sendOtp(channel: 'EMAIL' | 'SMS', to: string, code: string) {
  if (channel === 'EMAIL' && mailer) {
    await mailer.sendMail({
      from: env.MAIL_FROM, to,
      subject: 'Your VSP verification code',
      text: `Your VSP verification code is ${code}. It expires in 10 minutes. If you did not request it, ignore this email.`,
    });
    return;
  }
  if (!isProd) { logger.info({ to, code }, `DEV ONLY: ${channel} OTP`); return; }
  throw new AppError(503, `${channel === 'SMS' ? 'SMS' : 'Email'} delivery is not configured`);
}
