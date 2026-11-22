import fp from 'fastify-plugin';
import rateLimit from '@fastify/rate-limit';

export default fp(async (fastify) => {
  await fastify.register(rateLimit, {
    global: true,
    max: 240,
    timeWindow: '1 minute',
    keyGenerator: (req) => {
      return (
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        req.ip ||
        '127.0.0.1'
      );
    },
    errorResponseBuilder: (_request, context) => ({
      error: 'Too Many Requests',
      message: `Rate limit reached. Please wait ${Math.ceil(context.ttl / 1000)} seconds before trying again.`,
      statusCode: 429,
    }),
  });
});
