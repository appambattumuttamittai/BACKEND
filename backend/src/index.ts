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
import feedbackRoutes from './modules/feedback/feedback.routes';
import cartRoutes from './modules/cart/cart.routes';
import { startArchiveCron } from './services/archive.service';

async function start() {
  const config = getConfig();

  const app = Fastify({
    trustProxy: true,
    connectionTimeout: 30000,
    keepAliveTimeout: 65000,
    maxParamLength: 500,
    bodyLimit: 1048576,
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
      sameSite: 'none',
      maxAge: 86400000, // 24h in ms
    },
  });

  await app.register(corsPlugin);
  await app.register(helmetPlugin);
  await app.register(rateLimitPlugin);
  await app.register(prismaPlugin);

  // Root route
  app.get('/', async (_request, reply) => {
    return reply.send({ status: 'ok', service: 'muttamittai-backend' });
  });

  // Routes
  await app.register(healthRoutes, { prefix: '/health' });
  await app.register(healthRoutes, { prefix: '/api/health' });
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(otpRoutes, { prefix: '/api/otp' });
  await app.register(ordersRoutes, { prefix: '/api/orders' });
  await app.register(paymentsRoutes, { prefix: '/api/payments' });
  await app.register(productsRoutes, { prefix: '/api/products' });
  await app.register(adminRoutes, { prefix: '/api/admin' });
  await app.register(feedbackRoutes, { prefix: '/api/feedback' });
  await app.register(cartRoutes, { prefix: '/api/cart-notify' });

  // Global error handler
  app.setErrorHandler((error, _request, reply) => {
    app.log.error(error);
    reply.status(error.statusCode || 500).send({
      error: error.message || 'Internal Server Error',
    });
  });

  try {
    await app.listen({ port: config.PORT, host: '0.0.0.0' });

    // ── OTP Provider startup check ───────────────────────────────
    const provider = (config.OTP_PROVIDER || 'firebase').toLowerCase();
    if (provider === 'msg91') {
      if (!config.MSG91_AUTH_KEY || !config.MSG91_TEMPLATE_ID) {
        console.error('⚠️  OTP_PROVIDER=msg91 but MSG91_AUTH_KEY or MSG91_TEMPLATE_ID is missing! OTP will fail.');
      } else {
        console.log('✅ OTP Provider: MSG91 (live SMS)');
      }
    } else {
      if (config.FIREBASE_TEST_MODE) {
        console.log(`✅ OTP Provider: Firebase (TEST MODE) — OTP code is: ${config.FIREBASE_TEST_OTP}`);
      } else if (!config.FIREBASE_API_KEY) {
        console.error('⚠️  OTP_PROVIDER=firebase but FIREBASE_API_KEY is missing! OTP will fail.');
      } else {
        console.log('✅ OTP Provider: Firebase (live SMS)');
      }
    }

    console.log(`🚀 Server running on port ${config.PORT}`);

    // Start 30-day archive cron (checks daily at midnight IST)
    startArchiveCron(app.prisma);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
