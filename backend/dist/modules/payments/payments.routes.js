"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const payments_service_1 = require("./payments.service");
const paymentsRoutes = async (fastify) => {
    // Capture raw string body for cryptographic webhook signature verification
    fastify.addContentTypeParser('application/json', { parseAs: 'buffer' }, (req, body, done) => {
        try {
            const rawString = body.toString('utf8');
            req.rawBody = rawString;
            const json = JSON.parse(rawString);
            done(null, json);
        }
        catch (err) {
            err.statusCode = 400;
            done(err, undefined);
        }
    });
    const orderIdSchema = zod_1.z.object({ orderId: zod_1.z.string().min(1) });
    const verifySchema = zod_1.z.object({
        orderId: zod_1.z.string().min(1),
        razorpayOrderId: zod_1.z.string().min(1),
        razorpayPaymentId: zod_1.z.string().min(1),
        razorpaySignature: zod_1.z.string().min(1),
    });
    // Get Razorpay client configuration status
    fastify.get('/razorpay/config', async () => {
        return (0, payments_service_1.getRazorpayConfig)();
    });
    // Create Razorpay Order
    fastify.post('/razorpay/create-order', { config: { rateLimit: { max: 10, timeWindow: '5 minutes' } } }, async (request, reply) => {
        const result = orderIdSchema.safeParse(request.body);
        if (!result.success) {
            return reply.status(400).send({ error: 'Order ID is required' });
        }
        try {
            const orderData = await (0, payments_service_1.createRazorpayOrder)(fastify.prisma, result.data.orderId);
            return reply.send({ success: true, ...orderData });
        }
        catch (err) {
            const msg = err.message;
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
    });
    // Verify Razorpay Payment Signature
    fastify.post('/razorpay/verify', { config: { rateLimit: { max: 5, timeWindow: '5 minutes' } } }, async (request, reply) => {
        const result = verifySchema.safeParse(request.body);
        if (!result.success) {
            return reply.status(400).send({ error: 'Invalid verification payload' });
        }
        try {
            const res = await (0, payments_service_1.verifyRazorpayPayment)(fastify.prisma, result.data);
            return reply.send({
                success: true,
                orderId: res.id,
                status: res.status,
                message: 'Payment verified successfully! Your order is confirmed.',
            });
        }
        catch (err) {
            const msg = err.message;
            if (msg === 'INVALID_PAYMENT_SIGNATURE') {
                return reply.status(400).send({ error: 'Payment verification failed: invalid signature.' });
            }
            if (msg === 'ORDER_NOT_FOUND') {
                return reply.status(404).send({ error: 'Order not found.' });
            }
            fastify.log.error(err);
            return reply.status(500).send({ error: 'Failed to verify payment.' });
        }
    });
    // Razorpay Webhook (Direct server-to-server confirmation)
    fastify.post('/razorpay/webhook', async (request, reply) => {
        const rawBody = request.rawBody || JSON.stringify(request.body || {});
        const signature = request.headers['x-razorpay-signature'];
        try {
            const result = await (0, payments_service_1.handleRazorpayWebhook)(fastify.prisma, rawBody, signature, request.body);
            return reply.send(result);
        }
        catch (err) {
            const msg = err.message;
            if (msg === 'INVALID_WEBHOOK_SIGNATURE') {
                return reply.status(400).send({ error: 'Invalid webhook signature' });
            }
            fastify.log.error(err);
            return reply.status(500).send({ error: 'Webhook processing failed' });
        }
    });
    // Fallback: Manual UPI / QR code payment review
    fastify.post('/i-have-paid', { config: { rateLimit: { max: 5, timeWindow: '5 minutes' } } }, async (request, reply) => {
        const result = orderIdSchema.safeParse(request.body);
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