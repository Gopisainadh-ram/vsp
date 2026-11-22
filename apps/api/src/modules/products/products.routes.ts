import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { authenticate, requirePermission } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { prisma } from '../../lib/prisma';
import { AppError, asyncHandler } from '../../utils/errors';

type P = Prisma.ProductGetPayload<{ include: { variants: true } }>;
const dto = (p: P) => ({
  id: p.id, slug: p.slug, name: p.name, description: p.description, category: p.category, imageUrl: p.imageUrl,
  variants: p.variants.filter((v) => v.isActive).sort((a, b) => Number(a.price) - Number(b.price))
    .map((v) => ({ id: v.id, label: v.label, price: Number(v.price), stock: v.stock })),
});

export const productsRouter = Router();
productsRouter.get('/', asyncHandler(async (_req, res) => {
  const items = await prisma.product.findMany({
    where: { isActive: true, variants: { some: { isActive: true } } },
    include: { variants: true },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  });
  res.set('Cache-Control', 'public, max-age=30').json(items.map(dto));
}));

// Admin: stock management (permission stock:manage)
const variantSchema = z.object({
  label: z.string().trim().min(1).max(40),
  price: z.number().positive().max(100_000),
  stock: z.number().int().min(0).max(100_000),
}).strict();
const createProductSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().min(2).max(500),
  category: z.enum(['OIL', 'DRY_FRUIT']),
  imageUrl: z.string().trim().url().max(2048).refine((value) => /^https?:\/\//i.test(value), 'Image URL must use HTTP or HTTPS').optional(),
  variants: z.array(variantSchema).min(1).max(20).refine(
    (variants) => new Set(variants.map((v) => v.label.toLowerCase())).size === variants.length,
    'Each size must have a unique label',
  ),
}).strict();
const patchSchema = z.object({
  stock: z.number().int().min(0).max(100_000).optional(),
  price: z.number().positive().max(100_000).optional(),
}).refine((v) => v.stock !== undefined || v.price !== undefined, { message: 'Nothing to update' });

export const stockRouter = Router();
stockRouter.use(authenticate, requirePermission('stock:manage'));
stockRouter.get('/', asyncHandler(async (_req, res) => {
  const items = await prisma.product.findMany({ include: { variants: true }, orderBy: [{ category: 'asc' }, { name: 'asc' }] });
  res.json(items.map(dto));
}));
stockRouter.post('/products', validate({ body: createProductSchema }), asyncHandler(async (req, res) => {
  const { name, description, category, imageUrl, variants } = req.body as z.infer<typeof createProductSchema>;
  const slugBase = name.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'product';
  const product = await prisma.product.create({
    data: {
      slug: `${slugBase}-${randomUUID().slice(0, 8)}`,
      name,
      description,
      category,
      imageUrl,
      variants: { create: variants },
    },
    include: { variants: true },
  });
  res.status(201).json(dto(product));
}));
stockRouter.patch('/:variantId', validate({ params: z.object({ variantId: z.string().uuid() }), body: patchSchema }), asyncHandler(async (req, res) => {
  try {
    const v = await prisma.productVariant.update({ where: { id: req.params.variantId }, data: req.body });
    res.json({ id: v.id, stock: v.stock, price: Number(v.price) });
  } catch { throw new AppError(404, 'Item not found'); }
}));
