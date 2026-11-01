"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const otp_schema_1 = require("./otp.schema");
const otp_service_1 = require("./otp.service");
const otpRoutes = async (fastify) => {
    fastify.post('/send', { config: { rateLimit: { max: 3, timeWindow: '5 minutes' } } }, async (request, reply) => {
        const result = otp_schema_1.sendOtpSchema.safeParse(request.body);
        if (!result.success) {
            return reply
                .status(400)
                .send({ error: result.error.errors[0]?.message || 'Invalid phone number' });
        }
        try {
            const sessionId = await (0, otp_service_1.initiateOtp)(fastify.prisma, result.data.phone);
            return reply.send({ success: true, sessionId });
        }
        catch (err) {
            if (err.message === 'TOO_MANY_REQUESTS') {
                return reply
                    .status(429)
                    .send({ error: 'Too many OTP requests. Please wait 5 minutes.' });
            }
            fastify.log.error(err);
            return reply.status(500).send({ error: 'Failed to send OTP. Please try again.' });
        }
    });
    fastify.post('/verify', { config: { rateLimit: { max: 5, timeWindow: '10 minutes' } } }, async (request, reply) => {
        const result = otp_schema_1.verifyOtpSchema.safeParse(request.body);
        if (!result.success) {
            return reply
                .status(400)
                .send({ error: result.error.errors[0]?.message || 'Invalid input' });
        }
        const { phone, code, sessionId } = result.data;
        const { valid, sessionId: verifiedId } = await (0, otp_service_1.validateOtp)(fastify.prisma, phone, code, sessionId);
        if (!valid) {
            return reply.status(400).send({ error: 'Invalid or expired OTP. Please try again.' });
        }
        return reply.send({ success: true, verified: true, sessionId: verifiedId });
    });
};
exports.default = otpRoutes;
//# sourceMappingURL=otp.routes.js.map