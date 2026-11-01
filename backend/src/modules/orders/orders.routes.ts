import { FastifyPluginAsync } from 'fastify';
import { createOrderSchema } from './orders.schema';
import { createOrder, expireStaleOrders } from './orders.service';

const ordersRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post(
    '/',
    { config: { rateLimit: { max: 5, timeWindow: '10 minutes' } } },
    async (request, reply) => {
      const result = createOrderSchema.safeParse(request.body);
      if (!result.success) {
        return reply.status(400).send({
          error: 'Validation failed',
          details: result.error.flatten().fieldErrors,
        });
      }

      try {
        await expireStaleOrders(fastify.prisma);
        const order = await createOrder(fastify.prisma, result.data);

        return reply.status(201).send({
          orderId: order.id,
          totalAmount: order.totalAmount,
          paymentExpiry: order.paymentExpiry,
          status: order.status,
          product: {
            weight: order.product.weight,
            price: order.product.price,
          },
        });
      } catch (err: unknown) {
        const msg = (err as Error).message;
        if (msg === 'OTP_NOT_VERIFIED')
          return reply.status(401).send({ error: 'Phone verification required. Please verify your OTP.' });
        if (msg === 'PRODUCT_NOT_FOUND')
          return reply.status(404).send({ error: 'Product not found.' });
        if (msg === 'OUT_OF_STOCK')
          return reply.status(409).send({ error: 'This quantity is currently out of stock.' });
        fastify.log.error(err);
        return reply.status(500).send({ error: 'Failed to create order. Please try again.' });
      }
    }
  );

  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    await expireStaleOrders(fastify.prisma);

    const order = await fastify.prisma.order.findUnique({
      where: { id },
      include: { product: true },
    });

    if (!order) return reply.status(404).send({ error: 'Order not found' });

    return reply.send({
      id: order.id,
      customerName: order.customerName,
      phone: order.phone.slice(0, 2) + '****' + order.phone.slice(-4),
      product: {
        weight: order.product.weight,
        price: order.product.price,
      },
      totalAmount: order.totalAmount,
      status: order.status,
      paymentExpiry: order.paymentExpiry,
      city: order.city,
      createdAt: order.createdAt,
    });
  });
};

export default ordersRoutes;
