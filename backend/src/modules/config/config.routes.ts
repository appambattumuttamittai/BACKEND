import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { getQrImageUrl, setQrImageUrl } from './config.service';
import { isAdminAuthenticated } from '../auth/auth.service';

const configRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/qr-url', async (_request, reply) => {
    const url = await getQrImageUrl(fastify.prisma);
    return reply.send({ url });
  });

  fastify.post('/qr-url', async (request, reply) => {
    if (!isAdminAuthenticated(request)) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
    const schema = z.object({ url: z.string().url('Must be a valid URL') });
    const result = schema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({ error: result.error.errors[0]?.message });
    }
    const url = await setQrImageUrl(fastify.prisma, result.data.url);
    return reply.send({ success: true, url });
  });
};

export default configRoutes;
