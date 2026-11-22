import http from 'http';
import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';
import { z } from 'zod';
import { corsOrigins, env } from '../../config/env';
import { ROLE_PERMISSIONS } from '../../config/permissions';
import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';
import * as svc from './chat.service';

const payload = z.object({ conversationId: z.string().uuid().optional(), body: z.string().trim().min(1).max(1000) }).strict();

export function initChat(server: http.Server) {
  const io = new Server(server, { cors: { origin: corsOrigins, credentials: true }, maxHttpBufferSize: 10_000 });

  // Only signed-in, verified customers (and the owner) may connect: guests cannot chat.
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      const p = jwt.verify(String(token), env.JWT_ACCESS_SECRET, { algorithms: ['HS256'] });
      if (typeof p === 'string' || !p.sub) throw new Error('bad token');
      const user = await prisma.user.findUnique({ where: { id: p.sub }, select: { id: true, role: true, isVerified: true } });
      if (!user?.isVerified) throw new Error('unverified');
      socket.data.user = { id: user.id, role: user.role };
      next();
    } catch { next(new Error('unauthorized')); }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user as { id: string; role: 'USER' | 'ADMIN' };
    if (ROLE_PERMISSIONS[user.role].includes('chat:admin')) socket.join('admins');
    else socket.join(`user:${user.id}`);

    const sent: number[] = []; // simple per-socket flood control: 10 messages / 10 s
    socket.on('chat:send', async (raw, ack?: (r: { ok: boolean; error?: string }) => void) => {
      const now = Date.now();
      while (sent.length && now - sent[0] > 10_000) sent.shift();
      if (sent.length >= 10) return ack?.({ ok: false, error: 'You are sending messages too fast' });
      sent.push(now);
      try {
        const data = payload.parse(raw);
        const { conv, msg } = await svc.saveMessage(user, data.body, data.conversationId);
        io.to('admins').to(`user:${conv.userId}`).emit('chat:message', msg);
        ack?.({ ok: true });
      } catch (err: any) {
        if (!err?.issues && !err?.status) logger.error({ err }, 'chat send failed');
        ack?.({ ok: false, error: err?.status ? err.message : 'Message could not be sent' });
      }
    });
  });
  return io;
}
