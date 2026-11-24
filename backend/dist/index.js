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
const feedback_routes_1 = __importDefault(require("./modules/feedback/feedback.routes"));
const cart_routes_1 = __importDefault(require("./modules/cart/cart.routes"));
const archive_service_1 = require("./services/archive.service");
async function start() {
    const config = (0, config_1.getConfig)();
    const app = (0, fastify_1.default)({
        trustProxy: true,
        connectionTimeout: 30000,
        keepAliveTimeout: 65000,
        maxParamLength: 500,
        bodyLimit: 1048576,
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
            sameSite: 'none',
            maxAge: 86400000, // 24h in ms
        },
    });
    await app.register(cors_1.default);
    await app.register(helmet_1.default);
    await app.register(rateLimit_1.default);
    await app.register(prisma_1.default);
    // Root route
    app.get('/', async (_request, reply) => {
        return reply.send({ status: 'ok', service: 'muttamittai-backend' });
    });
    // Routes
    await app.register(health_routes_1.default, { prefix: '/health' });
    await app.register(health_routes_1.default, { prefix: '/api/health' });
    await app.register(auth_routes_1.default, { prefix: '/api/auth' });
    await app.register(otp_routes_1.default, { prefix: '/api/otp' });
    await app.register(orders_routes_1.default, { prefix: '/api/orders' });
    await app.register(payments_routes_1.default, { prefix: '/api/payments' });
    await app.register(products_routes_1.default, { prefix: '/api/products' });
    await app.register(admin_routes_1.default, { prefix: '/api/admin' });
    await app.register(feedback_routes_1.default, { prefix: '/api/feedback' });
    await app.register(cart_routes_1.default, { prefix: '/api/cart-notify' });
    // Global error handler
    app.setErrorHandler((error, _request, reply) => {
        app.log.error(error);
        const statusCode = error.statusCode || 500;
        const isProd = config.NODE_ENV === 'production';
        reply.status(statusCode).send({
            error: statusCode === 500 && isProd ? 'Internal Server Error' : (error.message || 'Internal Server Error'),
        });
    });
    try {
        await app.listen({ port: config.PORT, host: '0.0.0.0' });
        // ── OTP Provider startup check ───────────────────────────────
        const provider = (config.OTP_PROVIDER || 'firebase').toLowerCase();
        if (provider === 'msg91') {
            if (!config.MSG91_AUTH_KEY || !config.MSG91_TEMPLATE_ID) {
                console.error('⚠️  OTP_PROVIDER=msg91 but MSG91_AUTH_KEY or MSG91_TEMPLATE_ID is missing! OTP will fail.');
            }
            else {
                console.log('✅ OTP Provider: MSG91 (live SMS)');
            }
        }
        else {
            if (config.FIREBASE_TEST_MODE) {
                console.log(`✅ OTP Provider: Firebase (TEST MODE) — OTP code is: ${config.FIREBASE_TEST_OTP}`);
            }
            else if (!config.FIREBASE_API_KEY) {
                console.error('⚠️  OTP_PROVIDER=firebase but FIREBASE_API_KEY is missing! OTP will fail.');
            }
            else {
                console.log('✅ OTP Provider: Firebase (live SMS)');
            }
        }
        console.log(`🚀 Server running on port ${config.PORT}`);
        // Start 30-day archive cron (checks daily at midnight IST)
        (0, archive_service_1.startArchiveCron)(app.prisma);
    }
    catch (err) {
        app.log.error(err);
        process.exit(1);
    }
}
start();
//# sourceMappingURL=index.js.map