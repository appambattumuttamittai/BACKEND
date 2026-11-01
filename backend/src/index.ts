import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifySession from '@fastify/session';
import { getConfig } from './config';
import corsPlugin from './plugins/cors';
import helmetPlugin from './plugins/helmet';
import rateLimitPlugin from './plugins/rateLimit';
import prismaPlugin from './plugins/prisma';
import healthRoutes from './modules/health/health.routes';
import authRoutes from './modules/auth/auth.routes';
import otpRoutes from './modules/otp/otp.routes';
import ordersRoutes from './modules/orders/orders.routes';
import paymentsRoutes from './modules/payments/payments.routes';
import productsRoutes from './modules/products/products.routes';
import adminRoutes from './modules/admin/admin.routes';
import configRoutes from './modules/config/config.routes';

async function start() {
  const config = getConfig();

  const app = Fastify({
    logger: {
      level: config.NODE_ENV === 'production' ? 'info' : 'debug',
      redact: ['req.headers.authorization', 'body.phone', 'body.password'],
    },
  });

  // Core plugins
  await app.register(fastifyCookie);
  await app.register(fastifySession, {
    secret: config.ADMIN_SESSION_SECRET,
    cookieName: 'mm_session',
    cookie: {
      secure: config.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'strict',
      maxAge: 86400000, // 24h in ms
    },
  });

  await app.register(corsPlugin);
  await app.register(helmetPlugin);
  await app.register(rateLimitPlugin);
  await app.register(prismaPlugin);

  // Routes
  await app.register(healthRoutes, { prefix: '/health' });
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(otpRoutes, { prefix: '/api/otp' });
  await app.register(ordersRoutes, { prefix: '/api/orders' });
  await app.register(paymentsRoutes, { prefix: '/api/payments' });
  await app.register(productsRoutes, { prefix: '/api/products' });
  await app.register(adminRoutes, { prefix: '/api/admin' });
  await app.register(configRoutes, { prefix: '/api/config' });

  // Global error handler
  app.setErrorHandler((error, _request, reply) => {
    app.log.error(error);
    reply.status(error.statusCode || 500).send({
      error: error.message || 'Internal Server Error',
    });
  });

  try {
    await app.listen({ port: config.PORT, host: '0.0.0.0' });
    console.log(`🚀 Server running on port ${config.PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
