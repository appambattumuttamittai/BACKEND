import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

const notifySchema = z.object({
  productId:   z.string(),
  weight:      z.string(),
  weightLabel: z.string(),
  quantity:    z.number().int().min(1),
  price:       z.number().min(0),
  total:       z.number().min(0),
  addedAt:     z.string(),
});

const cartRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /api/cart-notify
   * Called by frontend when a user adds an item to cart.
   * Stores the last 100 events in AppConfig table (key = 'cart_notifications').
   * Admin can view this in the admin panel.
   */
  fastify.post('/', async (request, reply) => {
    const result = notifySchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({ error: 'Invalid cart data' });
    }

    const data = result.data;

    try {
      /* read existing notifications */
      const existing = await fastify.prisma.appConfig.findUnique({
        where: { key: 'cart_notifications' },
      });

      let notifications: object[] = [];
      if (existing?.value) {
        try { notifications = JSON.parse(existing.value); } catch { notifications = []; }
      }

      /* prepend new event, keep last 100 */
      notifications.unshift(data);
      if (notifications.length > 100) notifications = notifications.slice(0, 100);

      /* upsert */
      await fastify.prisma.appConfig.upsert({
        where:  { key: 'cart_notifications' },
        create: { key: 'cart_notifications', value: JSON.stringify(notifications), description: 'Recent add-to-cart events' },
        update: { value: JSON.stringify(notifications) },
      });

      fastify.log.info({ cartEvent: data }, 'Cart item added');
    } catch (err) {
      /* don't fail the request if DB write fails — cart still works */
      fastify.log.warn(err, 'Failed to store cart notification');
    }

    return reply.status(200).send({ success: true });
  });
};

export default cartRoutes;
