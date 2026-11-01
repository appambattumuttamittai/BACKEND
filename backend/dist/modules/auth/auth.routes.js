"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const auth_schema_1 = require("./auth.schema");
const auth_service_1 = require("./auth.service");
const authRoutes = async (fastify) => {
    fastify.post('/login', {
        config: { rateLimit: { max: 5, timeWindow: '15 minutes' } },
    }, async (request, reply) => {
        const result = auth_schema_1.loginSchema.safeParse(request.body);
        if (!result.success) {
            return reply.status(400).send({ error: 'Invalid input' });
        }
        const { username, password } = result.data;
        const valid = await (0, auth_service_1.verifyAdminCredentials)(username, password);
        if (!valid) {
            return reply.status(401).send({ error: 'Invalid username or password' });
        }
        const session = request.session;
        session.adminAuthenticated = true;
        await request.session.save();
        return reply.send({ success: true, message: 'Logged in successfully' });
    });
    fastify.post('/logout', async (request, reply) => {
        await request.session.destroy();
        return reply.send({ success: true, message: 'Logged out' });
    });
    fastify.get('/me', async (request, reply) => {
        if (!(0, auth_service_1.isAdminAuthenticated)(request)) {
            return reply.status(401).send({ error: 'Unauthorized' });
        }
        return reply.send({ authenticated: true, role: 'admin' });
    });
};
exports.default = authRoutes;
//# sourceMappingURL=auth.routes.js.map