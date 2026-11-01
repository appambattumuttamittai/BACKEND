"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const rate_limit_1 = __importDefault(require("@fastify/rate-limit"));
exports.default = (0, fastify_plugin_1.default)(async (fastify) => {
    await fastify.register(rate_limit_1.default, {
        global: true,
        max: 100,
        timeWindow: '1 minute',
        errorResponseBuilder: (_request, context) => ({
            error: 'Too Many Requests',
            message: `Rate limit exceeded. Retry after ${Math.ceil(context.ttl / 1000)} seconds.`,
            statusCode: 429,
        }),
    });
});
//# sourceMappingURL=rateLimit.js.map