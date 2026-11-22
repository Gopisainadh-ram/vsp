import crypto from 'crypto';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { env } from '../config/env';
import { AppError } from '../utils/errors';

export const GALLERY_DIR = path.resolve(env.UPLOAD_DIR, 'gallery');
fs.mkdirSync(GALLERY_DIR, { recursive: true });

const ALLOWED: Record<string, { ext: string; type: 'IMAGE' | 'VIDEO' }> = {
  'image/jpeg': { ext: '.jpg', type: 'IMAGE' },
  'image/png': { ext: '.png', type: 'IMAGE' },
  'image/webp': { ext: '.webp', type: 'IMAGE' },
  'video/mp4': { ext: '.mp4', type: 'VIDEO' },
  'video/webm': { ext: '.webm', type: 'VIDEO' },
};

export const galleryUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, GALLERY_DIR),
    // Server-generated name + extension from an allow-list: the client filename is never used (A01/A08).
    filename: (_req, file, cb) => cb(null, crypto.randomUUID() + ALLOWED[file.mimetype].ext),
  }),
  limits: { fileSize: 60 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) =>
    ALLOWED[file.mimetype] ? cb(null, true) : cb(new AppError(415, 'Only JPG, PNG, WebP, MP4 or WebM files are allowed')),
});

// The Content-Type header is client-controlled, so also check the real file signature.
export async function detectMedia(filePath: string, mime: string): Promise<'IMAGE' | 'VIDEO' | null> {
  const fh = await fs.promises.open(filePath, 'r');
  const b = Buffer.alloc(12);
  await fh.read(b, 0, 12, 0);
  await fh.close();
  const ok =
    (mime === 'image/jpeg' && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) ||
    (mime === 'image/png' && b.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]))) ||
    (mime === 'image/webp' && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') ||
    (mime === 'video/mp4' && b.toString('ascii', 4, 8) === 'ftyp') ||
    (mime === 'video/webm' && b.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])));
  return ok ? ALLOWED[mime].type : null;
}
