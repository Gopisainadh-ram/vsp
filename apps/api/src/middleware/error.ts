import { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { logger } from '../lib/logger';
import { AppError } from '../utils/errors';

export const notFound: RequestHandler = (_req, res) => { res.status(404).json({ message: 'Not found' }); };

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    return res.status(400).json({
      message: err.issues[0]?.message ?? 'Invalid input',
      issues: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }
  if (err instanceof AppError) return res.status(err.status).json({ message: err.message, code: err.code });
  // Unknown errors: log internally, reveal nothing to the client (A05/A09).
  logger.error({ err }, 'Unhandled error');
  return res.status(500).json({ message: 'Something went wrong. Please try again.' });
};
