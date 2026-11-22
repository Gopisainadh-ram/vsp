import { Router } from 'express';
import { z } from 'zod';
import { authenticate, optionalAuth, requirePermission } from '../../middleware/auth';
import { orderLimiter } from '../../middleware/rateLimit';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/errors';
import { phoneSchema } from '../auth/auth.schemas';
import * as svc from './orders.service';

const text = (min: number, max: number) => z.string().trim().min(min).max(max);

// Guests and members must both supply the same delivery details.
const orderSchema = z.object({
  customer: z.object({
    name: text(2, 80),
    phone: phoneSchema,
    email: z.string().trim().toLowerCase().email().max(254).optional().or(z.literal('').transform(() => undefined)),
    addressLine: text(5, 200),
    city: text(2, 60),
    state: text(2, 60),
    pincode: z.string().trim().regex(/^\d{6}$/, 'Enter a 6-digit pincode'),
  }).strict(),
  items: z.array(z.object({ variantId: z.string().uuid(), quantity: z.number().int().min(1).max(50) }).strict()).min(1).max(30),
  notes: text(0, 300).optional().transform((v) => v || undefined),
}).strict();

const router = Router();
router.post('/', orderLimiter, optionalAuth, validate({ body: orderSchema }), asyncHandler(async (req, res) => {
  res.status(201).json(await svc.placeOrder(req.body, req.user?.id));
}));
router.get('/mine', authenticate, asyncHandler(async (req, res) => { res.json(await svc.myOrders(req.user!.id)); }));
router.get('/admin', authenticate, requirePermission('orders:manage'), asyncHandler(async (_req, res) => {
  res.json(await svc.adminOrders());
}));
router.patch('/:orderId/status', authenticate, requirePermission('orders:manage'), validate({
  params: z.object({ orderId: z.string().uuid() }),
  body: z.object({ status: z.enum(['PLACED', 'CONFIRMED', 'DISPATCHED', 'DELIVERED', 'CANCELLED']) }).strict(),
}), asyncHandler(async (req, res) => {
  res.json(await svc.updateOrderStatus(req.params.orderId, req.body.status));
}));
export default router;
