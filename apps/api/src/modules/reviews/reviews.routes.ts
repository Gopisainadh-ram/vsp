import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { prisma } from '../../lib/prisma';
import { asyncHandler } from '../../utils/errors';

const router = Router();

router.get('/', asyncHandler(async (_req, res) => {
  const [rows, agg] = await Promise.all([
    prisma.review.findMany({ include: { user: { select: { name: true } } }, orderBy: { createdAt: 'desc' }, take: 100 }),
    prisma.review.aggregate({ _avg: { rating: true }, _count: true }),
  ]);
  res.json({
    average: agg._avg.rating ? Math.round(agg._avg.rating * 10) / 10 : null,
    count: agg._count,
    items: rows.map((r) => ({ id: r.id, name: r.user.name, rating: r.rating, comment: r.comment, createdAt: r.createdAt })),
  });
}));

// Registered customers only; one review each (posting again edits it).
router.post('/', authenticate, validate({ body: z.object({ rating: z.number().int().min(1).max(5), comment: z.string().trim().min(3).max(1000) }).strict() }),
  asyncHandler(async (req, res) => {
    const r = await prisma.review.upsert({
      where: { userId: req.user!.id }, update: req.body, create: { ...req.body, userId: req.user!.id },
    });
    res.status(201).json({ id: r.id });
  }));

export default router;
