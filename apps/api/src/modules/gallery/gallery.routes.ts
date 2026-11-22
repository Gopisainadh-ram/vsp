import fs from 'fs';
import path from 'path';
import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requirePermission } from '../../middleware/auth';
import { GALLERY_DIR, detectMedia, galleryUpload } from '../../middleware/upload';
import { validate } from '../../middleware/validate';
import { prisma } from '../../lib/prisma';
import { AppError, asyncHandler } from '../../utils/errors';

const router = Router();
const url = (filename: string) => `/uploads/gallery/${filename}`;

router.get('/', asyncHandler(async (_req, res) => {
  const items = await prisma.galleryItem.findMany({ orderBy: { createdAt: 'desc' }, take: 200 });
  res.json(items.map((g) => ({ id: g.id, type: g.type, url: url(g.filename), caption: g.caption, createdAt: g.createdAt })));
}));

router.post('/', authenticate, requirePermission('gallery:manage'), galleryUpload.single('file'), asyncHandler(async (req, res) => {
  const file = req.file;
  if (!file) throw new AppError(400, 'Choose a photo or video to upload');
  const type = await detectMedia(file.path, file.mimetype);
  if (!type) { await fs.promises.unlink(file.path); throw new AppError(415, 'That file does not look like a valid image or video'); }
  const caption = z.string().trim().max(160).optional().parse(req.body.caption) || null;
  const g = await prisma.galleryItem.create({ data: { type, filename: file.filename, caption, uploadedBy: req.user!.id } });
  res.status(201).json({ id: g.id, type: g.type, url: url(g.filename), caption: g.caption, createdAt: g.createdAt });
}));

router.delete('/:id', authenticate, requirePermission('gallery:manage'), validate({ params: z.object({ id: z.string().uuid() }) }), asyncHandler(async (req, res) => {
  const g = await prisma.galleryItem.findUnique({ where: { id: req.params.id } });
  if (!g) throw new AppError(404, 'Item not found');
  await prisma.galleryItem.delete({ where: { id: g.id } });
  await fs.promises.unlink(path.join(GALLERY_DIR, path.basename(g.filename))).catch(() => undefined);
  res.status(204).end();
}));

export default router;
