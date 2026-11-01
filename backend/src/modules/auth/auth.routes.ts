import { FastifyPluginAsync } from 'fastify';
import { loginSchema } from './auth.schema';
import { verifyAdminCredentials, isAdminAuthenticated } from './auth.service';

const authRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post(
    '/login',
    {
      config: { rateLimit: { max: 5, timeWindow: '15 minutes' } },
    },
    async (request, reply) => {
      const result = loginSchema.safeParse(request.body);
      if (!result.success) {
        return reply.status(400).send({ error: 'Invalid input' });
      }

      const { username, password } = result.data;
      const valid = await verifyAdminCredentials(username, password);

      if (!valid) {
        return reply.status(401).send({ error: 'Invalid username or password' });
      }

      const session = request.session as unknown as Record<string, unknown>;
      session.adminAuthenticated = true;
      await request.session.save();

      return reply.send({ success: true, message: 'Logged in successfully' });
    }
  );

  fastify.post('/logout', async (request, reply) => {
    await request.session.destroy();
    return reply.send({ success: true, message: 'Logged out' });
  });

  fastify.get('/me', async (request, reply) => {
    if (!isAdminAuthenticated(request)) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
    return reply.send({ authenticated: true, role: 'admin' });
  });
};

export default authRoutes;
