"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const orders_schema_1 = require("./orders.schema");
const orders_service_1 = require("./orders.service");
const pdf_service_1 = require("../../services/pdf.service");
const ordersRoutes = async (fastify) => {
    fastify.post('/', { config: { rateLimit: { max: 5, timeWindow: '10 minutes' } } }, async (request, reply) => {
        const result = orders_schema_1.createOrderSchema.safeParse(request.body);
        if (!result.success) {
            return reply.status(400).send({
                error: 'Validation failed',
                details: result.error.flatten().fieldErrors,
            });
        }
        try {
            await (0, orders_service_1.expireStaleOrders)(fastify.prisma);
            const order = await (0, orders_service_1.createOrder)(fastify.prisma, result.data);
            return reply.status(201).send({
                orderId: order.id,
                totalAmount: order.totalAmount,
                paymentExpiry: order.paymentExpiry,
                status: order.status,
                product: {
                    weight: order.itemsSummary || order.product.weight,
                    price: order.totalAmount,
                },
            });
        }
        catch (err) {
            const msg = err.message;
            if (msg === 'OTP_NOT_VERIFIED')
                return reply.status(401).send({ error: 'Phone verification required. Please verify your OTP.' });
            if (msg === 'PRODUCT_NOT_FOUND')
                return reply.status(404).send({ error: 'Product not found.' });
            if (msg === 'OUT_OF_STOCK')
                return reply.status(409).send({ error: 'This quantity is currently out of stock.' });
            fastify.log.error(err);
            return reply.status(500).send({ error: 'Failed to create order. Please try again.' });
        }
    });
    fastify.get('/:id', { config: { rateLimit: { max: 60, timeWindow: '1 minute' } } }, async (request, reply) => {
        const { id } = request.params;
        await (0, orders_service_1.expireStaleOrders)(fastify.prisma);
        const cleanId = id.replace(/^#/, '').trim();
        let order = await fastify.prisma.order.findUnique({
            where: { id: cleanId },
            include: { product: true },
        });
        if (!order && cleanId.length <= 12) {
            order = await fastify.prisma.order.findFirst({
                where: {
                    OR: [
                        { id: { endsWith: cleanId.toLowerCase() } },
                        { id: { endsWith: cleanId.toUpperCase() } },
                    ],
                },
                include: { product: true },
            });
        }
        if (!order)
            return reply.status(404).send({ error: 'Order not found' });
        // Clean up internal notes (e.g. "| Razorpay: pay_xxx") so public weight is always pristine
        const cleanWeight = (order.adminNotes || order.product.weight)
            .split(/\||\s*Razorpay:/i)[0]
            .replace(/\[STORE PICKUP\]|\[HOME DELIVERY\]/gi, '')
            .trim() || order.product.weight;
        const txIdMatch = order.adminNotes?.match(/Razorpay:\s*([A-Za-z0-9_]+)/i);
        const transactionId = txIdMatch ? txIdMatch[1] : undefined;
        return reply.send({
            id: order.id,
            customerName: order.customerName,
            phone: order.phone,
            product: {
                id: order.product.id,
                weight: cleanWeight,
                price: order.totalAmount,
            },
            totalAmount: order.totalAmount,
            status: order.status,
            paymentExpiry: order.paymentExpiry,
            streetAddress: order.streetAddress,
            city: order.city,
            pincode: order.pincode,
            transactionId,
            createdAt: order.createdAt,
        });
    });
    fastify.get('/:id/invoice.pdf', { config: { rateLimit: { max: 15, timeWindow: '1 minute' } } }, async (request, reply) => {
        const { id } = request.params;
        const cleanId = id.replace(/^#/, '').trim();
        let order = await fastify.prisma.order.findUnique({
            where: { id: cleanId },
            include: { product: true },
        });
        if (!order && cleanId.length <= 12) {
            order = await fastify.prisma.order.findFirst({
                where: {
                    OR: [
                        { id: { endsWith: cleanId.toLowerCase() } },
                        { id: { endsWith: cleanId.toUpperCase() } },
                    ],
                },
                include: { product: true },
            });
        }
        if (!order)
            return reply.status(404).send({ error: 'Order not found' });
        const pdfBuffer = (0, pdf_service_1.generateOrderInvoicePDF)(order);
        return reply
            .header('Content-Type', 'application/pdf')
            .header('Content-Disposition', `attachment; filename="Invoice-${order.id.slice(-8).toUpperCase()}.pdf"`)
            .header('Cache-Control', 'public, max-age=3600')
            .send(pdfBuffer);
    });
    fastify.get('/:id/receipt.pdf', async (request, reply) => {
        const { id } = request.params;
        const cleanId = id.replace(/^#/, '').trim();
        let order = await fastify.prisma.order.findUnique({
            where: { id: cleanId },
            include: { product: true },
        });
        if (!order && cleanId.length <= 12) {
            order = await fastify.prisma.order.findFirst({
                where: {
                    OR: [
                        { id: { endsWith: cleanId.toLowerCase() } },
                        { id: { endsWith: cleanId.toUpperCase() } },
                    ],
                },
                include: { product: true },
            });
        }
        if (!order)
            return reply.status(404).send({ error: 'Order not found' });
        const pdfBuffer = (0, pdf_service_1.generateOrderInvoicePDF)(order);
        return reply
            .header('Content-Type', 'application/pdf')
            .header('Content-Disposition', `attachment; filename="Receipt-${order.id.slice(-8).toUpperCase()}.pdf"`)
            .send(pdfBuffer);
    });
};
exports.default = ordersRoutes;
//# sourceMappingURL=orders.routes.js.map