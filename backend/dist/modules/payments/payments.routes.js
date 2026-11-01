"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const payments_service_1 = require("./payments.service");
const paymentsRoutes = async (fastify) => {
    const schema = zod_1.z.object({ orderId: zod_1.z.string().min(1) });
    fastify.post('/i-have-paid', { config: { rateLimit: { max: 3, timeWindow: '5 minutes' } } }, async (request, reply) => {
        const result = schema.safeParse(request.body);
        if (!result.success) {
            return reply.status(400).send({ error: 'Order ID is required' });
        }
        try {
            const data = await (0, payments_service_1.markPaymentReview)(fastify.prisma, result.data.orderId);
            return reply.send({
                success: true,
                orderId: data.id,
                status: data.status,
                message: 'Thank you! Your payment is under review. We will confirm within a few minutes.',
            });
        }
        catch (err) {
            const msg = err.message;
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
    });
};
exports.default = paymentsRoutes;
//# sourceMappingURL=payments.routes.js.map