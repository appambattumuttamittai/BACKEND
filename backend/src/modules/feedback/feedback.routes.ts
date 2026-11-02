import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

const submitSchema = z.object({
  name: z.string().min(2).max(60),
  rating: z.number().int().min(1).max(5),
  message: z.string().min(5).max(500),
});

const feedbackRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/feedback — public, returns only approved feedbacks
  fastify.get('/', async (_request, reply) => {
    const feedbacks = await fastify.prisma.feedback.findMany({
      where: { isApproved: true },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, rating: true, message: true, createdAt: true },
    });
    return reply.send(feedbacks);
  });

  // POST /api/feedback — public, submit a new feedback (pending approval)
  fastify.post('/', async (request, reply) => {
    const result = submitSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({ error: 'Invalid feedback data', details: result.error.flatten() });
    }
    const feedback = await fastify.prisma.feedback.create({
      data: {
        name: result.data.name,
        rating: result.data.rating,
        message: result.data.message,
        isApproved: false,
      },
    });
    return reply.status(201).send({ success: true, id: feedback.id });
  });
};

export default feedbackRoutes;
