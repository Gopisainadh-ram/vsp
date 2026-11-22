import http from 'http';
import { env } from './config/env';
import { createApp } from './app';
import { logger } from './lib/logger';
import { prisma } from './lib/prisma';
import { initChat } from './modules/chat/chat.socket';

const server = http.createServer(createApp());
initChat(server);
server.listen(env.PORT, () => logger.info(`API listening on :${env.PORT}`));

const shutdown = () => server.close(async () => { await prisma.$disconnect(); process.exit(0); });
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
