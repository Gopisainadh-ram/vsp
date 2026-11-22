import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requirePermission } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../utils/errors';
import * as svc from './chat.service';

const router = Router();
router.use(authenticate);

router.get('/me/messages', asyncHandler(async (req, res) => {
  const conv = await svc.myConversation(req.user!.id);
  res.json(await svc.history(conv.id));
}));

router.get('/conversations', requirePermission('chat:admin'), asyncHandler(async (_req, res) => { res.json(await svc.listConversations()); }));
router.get('/conversations/:id/messages', requirePermission('chat:admin'), validate({ params: z.object({ id: z.string().uuid() }) }),
  asyncHandler(async (req, res) => { res.json(await svc.history(req.params.id)); }));

export default router;
