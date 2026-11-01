"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const config_service_1 = require("./config.service");
const auth_service_1 = require("../auth/auth.service");
const configRoutes = async (fastify) => {
    fastify.get('/qr-url', async (_request, reply) => {
        const url = await (0, config_service_1.getQrImageUrl)(fastify.prisma);
        return reply.send({ url });
    });
    fastify.post('/qr-url', async (request, reply) => {
        if (!(0, auth_service_1.isAdminAuthenticated)(request)) {
            return reply.status(401).send({ error: 'Unauthorized' });
        }
        const schema = zod_1.z.object({ url: zod_1.z.string().url('Must be a valid URL') });
        const result = schema.safeParse(request.body);
        if (!result.success) {
            return reply.status(400).send({ error: result.error.errors[0]?.message });
        }
        const url = await (0, config_service_1.setQrImageUrl)(fastify.prisma, result.data.url);
        return reply.send({ success: true, url });
    });
};
exports.default = configRoutes;
//# sourceMappingURL=config.routes.js.map