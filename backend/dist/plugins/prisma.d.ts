import { PrismaClient } from '@prisma/client';
import { FastifyInstance } from 'fastify';
declare module 'fastify' {
    interface FastifyInstance {
        prisma: PrismaClient;
    }
}
declare const _default: (fastify: FastifyInstance) => Promise<void>;
export default _default;
