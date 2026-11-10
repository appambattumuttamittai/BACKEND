import fp from 'fastify-plugin';
import cors from '@fastify/cors';
import { getConfig } from '../config';

export default fp(async (fastify) => {
  const config = getConfig();
  await fastify.register(cors, {
    origin: (origin, cb) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) return cb(null, true);

      const allowedOrigins = [
        config.FRONTEND_URL,
        'https://appampattueggsweet.com',
        'https://www.appampattueggsweet.com',
        'https://appambattumuttamittai.com',
        'http://localhost:3000',
        'http://localhost:3001',
      ];

      if (
        config.FRONTEND_URL === '*' ||
        allowedOrigins.includes(origin) ||
        origin.endsWith('.vercel.app')
      ) {
        return cb(null, true);
      }

      cb(new Error(`Origin ${origin} not allowed by CORS`), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  });
});
