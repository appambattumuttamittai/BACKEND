import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import {
  markPaymentReview,
  getRazorpayConfig,
  createRazorpayOrder,
  verifyRazorpayPayment,
} from './payments.service';

const paymentsRoutes: FastifyPluginAsync = async (fastify) => {
  const orderIdSchema = z.object({ orderId: z.string().min(1) });

  const verifySchema = z.object({
    orderId: z.string().min(1),
    razorpayOrderId: z.string().min(1),
    razorpayPaymentId: z.string().min(1),
    razorpaySignature: z.string().min(1),
  });

  // Get Razorpay client configuration status
  fastify.get('/razorpay/config', async () => {
    return getRazorpayConfig();
  });

  // Create Razorpay Order
  fastify.post(
    '/razorpay/create-order',
    { config: { rateLimit: { max: 10, timeWindow: '5 minutes' } } },
    async (request, reply) => {
      const result = orderIdSchema.safeParse(request.body);
      if (!result.success) {
        return reply.status(400).send({ error: 'Order ID is required' });
      }

      try {
        const orderData = await createRazorpayOrder(fastify.prisma, result.data.orderId);
        return reply.send({ success: true, ...orderData });
      } catch (err: unknown) {
        const msg = (err as Error).message;
        if (msg === 'RAZORPAY_NOT_CONFIGURED') {
          return reply.status(503).send({
            error: 'RAZORPAY_NOT_CONFIGURED',
            message: 'Razorpay keys not yet configured in backend environment variables.',
          });
        }
        if (msg === 'ORDER_NOT_FOUND') {
          return reply.status(404).send({ error: 'Order not found.' });
        }
        if (msg === 'ALREADY_PAID') {
          return reply.status(400).send({ error: 'This order is already paid.' });
        }
        fastify.log.error(err);
        return reply.status(500).send({ error: 'Failed to initiate Razorpay order' });
      }
    }
  );

  // Verify Razorpay Payment Signature
  fastify.post(
    '/razorpay/verify',
    { config: { rateLimit: { max: 5, timeWindow: '5 minutes' } } },
    async (request, reply) => {
      const result = verifySchema.safeParse(request.body);
      if (!result.success) {
        return reply.status(400).send({ error: 'Invalid verification payload' });
      }

      try {
        const res = await verifyRazorpayPayment(fastify.prisma, result.data);
        return reply.send({
          success: true,
          orderId: res.id,
          status: res.status,
          message: 'Payment verified successfully! Your order is confirmed.',
        });
      } catch (err: unknown) {
        const msg = (err as Error).message;
        if (msg === 'INVALID_PAYMENT_SIGNATURE') {
          return reply.status(400).send({ error: 'Payment verification failed: invalid signature.' });
        }
        if (msg === 'ORDER_NOT_FOUND') {
          return reply.status(404).send({ error: 'Order not found.' });
        }
        fastify.log.error(err);
        return reply.status(500).send({ error: 'Failed to verify payment.' });
      }
    }
  );

  // Fallback: Manual UPI / QR code payment review
  fastify.post(
    '/i-have-paid',
    { config: { rateLimit: { max: 5, timeWindow: '5 minutes' } } },
    async (request, reply) => {
      const result = orderIdSchema.safeParse(request.body);
      if (!result.success) {
        return reply.status(400).send({ error: 'Order ID is required' });
      }

      try {
        const data = await markPaymentReview(fastify.prisma, result.data.orderId);
        return reply.send({
          success: true,
          orderId: data.id,
          status: data.status,
          message:
            'Thank you! Your payment is under review. We will confirm within a few minutes.',
        });
      } catch (err: unknown) {
        const msg = (err as Error).message;
        if (msg === 'ORDER_NOT_FOUND')
          return reply.status(404).send({ error: 'Order not found.' });
        if (msg === 'PAYMENT_EXPIRED')
          return reply.status(410).send({
            error: 'Payment window has expired. Please place a new order.',
          });
        if (msg.startsWith('INVALID_STATUS'))
          return reply.status(409).send({ error: 'This order cannot be updated.' });
        fastify.log.error(err);
        return reply.status(500).send({ error: 'Failed to update payment status.' });
      }
    }
  );
};

export default paymentsRoutes;
