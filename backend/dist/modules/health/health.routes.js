"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const healthRoutes = async (fastify) => {
    fastify.get('/', async (_request, reply) => {
        return reply.send({
            status: 'ok',
            timestamp: new Date().toISOString(),
            service: 'muttamittai-backend',
        });
    });
};
exports.default = healthRoutes;
//# sourceMappingURL=health.routes.js.map