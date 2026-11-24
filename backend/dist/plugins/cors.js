"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const cors_1 = __importDefault(require("@fastify/cors"));
const config_1 = require("../config");
exports.default = (0, fastify_plugin_1.default)(async (fastify) => {
    const config = (0, config_1.getConfig)();
    await fastify.register(cors_1.default, {
        origin: (origin, cb) => {
            // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
            if (!origin)
                return cb(null, true);
            const allowedOrigins = [
                config.FRONTEND_URL,
                'https://appampattueggsweet.com',
                'https://www.appampattueggsweet.com',
                'https://appambattumuttamittai.com',
                'http://localhost:3000',
                'http://localhost:3001',
            ];
            if (config.FRONTEND_URL === '*' ||
                allowedOrigins.includes(origin) ||
                origin.endsWith('.vercel.app')) {
                return cb(null, true);
            }
            cb(new Error(`Origin ${origin} not allowed by CORS`), false);
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    });
});
//# sourceMappingURL=cors.js.map