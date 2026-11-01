"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const auth_service_1 = require("../auth/auth.service");
const products_schema_1 = require("./products.schema");
const productsRoutes = async (fastify) => {
    // Public endpoint - returns all products with prices from DB
    fastify.get('/', async (_request, reply) => {
        const products = await fastify.prisma.product.findMany({
            orderBy: { weightGrams: 'asc' },
        });
        return reply.send(products);
    });
    // Admin only - update price or stock
    fastify.patch('/:id', async (request, reply) => {
        if (!(0, auth_service_1.isAdminAuthenticated)(request)) {
            return reply.status(401).send({ error: 'Unauthorized' });
        }
        const { id } = request.params;
        const result = products_schema_1.updateProductSchema.safeParse(request.body);
        if (!result.success) {
            return reply
                .status(400)
                .send({ error: 'Invalid input', details: result.error.flatten() });
        }
        try {
            const updated = await fastify.prisma.product.update({
                where: { id },
                data: result.data,
            });
            return reply.send(updated);
        }
        catch {
            return reply.status(404).send({ error: 'Product not found' });
        }
    });
};
exports.default = productsRoutes;
//# sourceMappingURL=products.routes.js.map