import pino from 'pino';
import { isProd } from '../config/env';

export const logger = pino({
  level: isProd ? 'info' : 'debug',
  // Never write credentials or tokens to logs (OWASP A09).
  redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]', '*.password', '*.passwordHash'],
});
