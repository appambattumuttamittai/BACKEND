"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const auth_service_1 = require("../auth/auth.service");
const admin_schema_1 = require("./admin.schema");
const admin_service_1 = require("./admin.service");
const config_1 = require("../../config");
// Middleware to protect all admin routes
async function requireAdmin(request, reply) {
    if (!(0, auth_service_1.isAdminAuthenticated)(request)) {
        return reply.status(401).send({ error: 'Unauthorized. Admin login required.' });
    }
}
const adminRoutes = async (fastify) => {
    fastify.addHook('preHandler', requireAdmin);
    // Dashboard stats
    fastify.get('/stats', async (_request, reply) => {
        const stats = await (0, admin_service_1.getDashboardStats)(fastify.prisma);
        return reply.send(stats);
    });
    // Orders list with filters
    fastify.get('/orders', async (request, reply) => {
        const result = admin_schema_1.orderFiltersSchema.safeParse(request.query);
        if (!result.success) {
            return reply.status(400).send({ error: 'Invalid filters' });
        }
        const data = await (0, admin_service_1.getOrders)(fastify.prisma, result.data);
        return reply.send(data);
    });
    // Single order detail (admin sees full data)
    fastify.get('/orders/:id', async (request, reply) => {
        const { id } = request.params;
        const order = await fastify.prisma.order.findUnique({
            where: { id },
            include: { product: true },
        });
        if (!order)
            return reply.status(404).send({ error: 'Order not found' });
        // Admin sees masked phone only
        return reply.send({
            ...order,
            phone: order.phone.slice(0, 2) + '****' + order.phone.slice(-4),
        });
    });
    // Update order status
    fastify.patch('/orders/:id/status', async (request, reply) => {
        const { id } = request.params;
        const result = admin_schema_1.updateOrderStatusSchema.safeParse(request.body);
        if (!result.success) {
            return reply.status(400).send({ error: 'Invalid status value' });
        }
        try {
            const order = await (0, admin_service_1.updateOrderStatus)(fastify.prisma, id, result.data.status, result.data.adminNotes);
            return reply.send(order);
        }
        catch {
            return reply.status(404).send({ error: 'Order not found' });
        }
    });
    // Export CSV
    fastify.get('/export/csv', async (request, reply) => {
        const { status, dateFrom, dateTo } = request.query;
        const csv = await (0, admin_service_1.exportOrdersCsv)(fastify.prisma, { status, dateFrom, dateTo });
        const filename = `muttamittai-orders-${new Date().toISOString().split('T')[0]}.csv`;
        reply.header('Content-Type', 'text/csv; charset=utf-8');
        reply.header('Content-Disposition', `attachment; filename="${filename}"`);
        return reply.send('\uFEFF' + csv); // BOM for Excel UTF-8 compatibility
    });
    // Charts data
    fastify.get('/charts', async (_request, reply) => {
        const data = await (0, admin_service_1.getDailyChartData)(fastify.prisma);
        return reply.send(data);
    });
    // Google Sheets URL (secure - admin only)
    fastify.get('/sheets-url', async (_request, reply) => {
        const config = (0, config_1.getConfig)();
        return reply.send({ url: config.GOOGLE_SHEETS_URL || null });
    });
    // Product management (admin)
    fastify.get('/products', async (_request, reply) => {
        const products = await fastify.prisma.product.findMany({
            orderBy: { weightGrams: 'asc' },
        });
        return reply.send(products);
    });
};
exports.default = adminRoutes;
//# sourceMappingURL=admin.routes.js.map