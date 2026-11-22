import { Router } from 'express';
import { z } from 'zod';
import { contactLimiter } from '../../middleware/rateLimit';
import { validate } from '../../middleware/validate';
import { prisma } from '../../lib/prisma';
import { clean, notifyOwner } from '../../lib/whatsapp';
import { asyncHandler } from '../../utils/errors';
import { phoneSchema } from '../auth/auth.schemas';

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email().max(254).optional().or(z.literal('').transform(() => undefined)),
  phone: phoneSchema.optional().or(z.literal('').transform(() => undefined)),
  message: z.string().trim().min(5).max(2000),
}).strict().refine((v) => v.email || v.phone, { message: 'Add an email or phone so we can reply', path: ['email'] });

const router = Router();
router.post('/', contactLimiter, validate({ body: schema }), asyncHandler(async (req, res) => {
  const m = await prisma.contactMessage.create({ data: req.body });
  void notifyOwner(`✉️ Website enquiry\nFrom: ${clean(m.name, 80)}\nContact: ${clean(m.phone ?? m.email ?? '', 120)}\n${clean(m.message, 600)}`);
  res.status(201).json({ message: 'Thanks! We will get back to you soon.' });
}));
export default router;
