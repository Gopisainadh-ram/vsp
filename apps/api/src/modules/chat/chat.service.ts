import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/errors';

export const toDto = (m: { id: string; conversationId: string; fromAdmin: boolean; body: string; createdAt: Date }) =>
  ({ id: m.id, conversationId: m.conversationId, fromAdmin: m.fromAdmin, body: m.body, createdAt: m.createdAt });

export async function myConversation(userId: string) {
  return prisma.conversation.upsert({ where: { userId }, update: {}, create: { userId } });
}

/** Authorisation lives here: a customer can only ever write to their own thread. */
export async function saveMessage(sender: { id: string; role: 'USER' | 'ADMIN' }, body: string, conversationId?: string) {
  let conv;
  if (sender.role === 'ADMIN') {
    if (!conversationId) throw new AppError(400, 'Choose a conversation');
    conv = await prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conv) throw new AppError(404, 'Conversation not found');
  } else {
    conv = await myConversation(sender.id);
  }
  const [msg] = await prisma.$transaction([
    prisma.message.create({ data: { conversationId: conv.id, fromAdmin: sender.role === 'ADMIN', body } }),
    prisma.conversation.update({ where: { id: conv.id }, data: { lastMessageAt: new Date() } }),
  ]);
  return { conv, msg: toDto(msg) };
}

export async function history(conversationId: string) {
  const rows = await prisma.message.findMany({ where: { conversationId }, orderBy: { createdAt: 'desc' }, take: 100 });
  return rows.reverse().map(toDto);
}

export async function listConversations() {
  const rows = await prisma.conversation.findMany({
    orderBy: { lastMessageAt: 'desc' }, take: 100,
    include: { user: { select: { name: true, phone: true, email: true } }, messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
  });
  return rows.map((c) => ({ id: c.id, user: c.user, lastMessage: c.messages[0]?.body ?? '', lastMessageAt: c.lastMessageAt }));
}
