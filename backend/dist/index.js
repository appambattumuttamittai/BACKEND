"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const cookie_1 = __importDefault(require("@fastify/cookie"));
const session_1 = __importDefault(require("@fastify/session"));
const config_1 = require("./config");
const cors_1 = __importDefault(require("./plugins/cors"));
const helmet_1 = __importDefault(require("./plugins/helmet"));
const rateLimit_1 = __importDefault(require("./plugins/rateLimit"));
const prisma_1 = __importDefault(require("./plugins/prisma"));
const health_routes_1 = __importDefault(require("./modules/health/health.routes"));
const auth_routes_1 = __importDefault(require("./modules/auth/auth.routes"));
const otp_routes_1 = __importDefault(require("./modules/otp/otp.routes"));
const orders_routes_1 = __importDefault(require("./modules/orders/orders.routes"));
const payments_routes_1 = __importDefault(require("./modules/payments/payments.routes"));
const products_routes_1 = __importDefault(require("./modules/products/products.routes"));
const admin_routes_1 = __importDefault(require("./modules/admin/admin.routes"));
const config_routes_1 = __importDefault(require("./modules/config/config.routes"));
async function start() {
    const config = (0, config_1.getConfig)();
    const app = (0, fastify_1.default)({
        logger: {
            level: config.NODE_ENV === 'production' ? 'info' : 'debug',
            redact: ['req.headers.authorization', 'body.phone', 'body.password'],
        },
    });
    // Core plugins
    await app.register(cookie_1.default);
    await app.register(session_1.default, {
        secret: config.ADMIN_SESSION_SECRET,
        cookieName: 'mm_session',
        cookie: {
            secure: config.NODE_ENV === 'production',
            httpOnly: true,
            sameSite: 'strict',
            maxAge: 86400000, // 24h in ms
        },
    });
    await app.register(cors_1.default);
    await app.register(helmet_1.default);
    await app.register(rateLimit_1.default);
    await app.register(prisma_1.default);
    // Routes
    await app.register(health_routes_1.default, { prefix: '/health' });
    await app.register(auth_routes_1.default, { prefix: '/api/auth' });
    await app.register(otp_routes_1.default, { prefix: '/api/otp' });
    await app.register(orders_routes_1.default, { prefix: '/api/orders' });
    await app.register(payments_routes_1.default, { prefix: '/api/payments' });
    await app.register(products_routes_1.default, { prefix: '/api/products' });
    await app.register(admin_routes_1.default, { prefix: '/api/admin' });
    await app.register(config_routes_1.default, { prefix: '/api/config' });
    // Global error handler
    app.setErrorHandler((error, _request, reply) => {
        app.log.error(error);
        reply.status(error.statusCode || 500).send({
            error: error.message || 'Internal Server Error',
        });
    });
    try {
        await app.listen({ port: config.PORT, host: '0.0.0.0' });
        console.log(`🚀 Server running on port ${config.PORT}`);
    }
    catch (err) {
        app.log.error(err);
        process.exit(1);
    }
}
start();
//# sourceMappingURL=index.js.map