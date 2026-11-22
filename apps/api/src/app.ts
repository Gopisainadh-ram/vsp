import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { corsOrigins } from './config/env';
import { logger } from './lib/logger';
import { errorHandler, notFound } from './middleware/error';
import { globalLimiter } from './middleware/rateLimit';
import { GALLERY_DIR } from './middleware/upload';
import authRoutes from './modules/auth/auth.routes';
import chatRoutes from './modules/chat/chat.routes';
import contactRoutes from './modules/contact/contact.routes';
import galleryRoutes from './modules/gallery/gallery.routes';
import orderRoutes from './modules/orders/orders.routes';
import { productsRouter, stockRouter } from './modules/products/products.routes';
import reviewRoutes from './modules/reviews/reviews.routes';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1); // behind nginx / load balancer: correct client IPs for rate limiting

  app.use(pinoHttp({ logger }));
  app.use(helmet());                                     // CSP, HSTS, nosniff, frame-ancestors...
  app.use(cors({ origin: corsOrigins, credentials: true })); // explicit allow-list, never "*"
  app.use(express.json({ limit: '50kb' }));              // small body cap
  app.use(cookieParser());
  app.use('/api', globalLimiter);

  // Uploaded media: served as static, never executed. nosniff stops MIME-confusion attacks.
  app.use('/uploads/gallery', express.static(GALLERY_DIR, {
    index: false, dotfiles: 'deny', maxAge: '7d',
    setHeaders: (res) => { res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox"); },
  }));

  app.get('/api/health', (_req, res) => { res.json({ status: 'ok' }); });
  app.use('/api/auth', authRoutes);
  app.use('/api/products', productsRouter);
  app.use('/api/admin/stock', stockRouter);
  app.use('/api/orders', orderRoutes);
  app.use('/api/gallery', galleryRoutes);
  app.use('/api/reviews', reviewRoutes);
  app.use('/api/contact', contactRoutes);
  app.use('/api/chat', chatRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
