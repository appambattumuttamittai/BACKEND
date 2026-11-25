"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const otp_schema_1 = require("./otp.schema");
const otp_service_1 = require("./otp.service");
const email_service_1 = require("../../services/email.service");
const telegram_service_1 = require("../../services/telegram.service");
const otpRoutes = async (fastify) => {
    fastify.post('/send', { config: { rateLimit: { max: 10, timeWindow: '5 minutes' } } }, async (request, reply) => {
        const result = otp_schema_1.sendOtpSchema.safeParse(request.body);
        if (!result.success) {
            return reply
                .status(400)
                .send({ error: result.error.errors[0]?.message || 'Invalid details' });
        }
        try {
            const sessionId = await (0, otp_service_1.initiateOtp)(fastify.prisma, result.data.phone, result.data.email, result.data.customerName);
            // Deduplicated lead alert to admin Gmail & Telegram (30 min cooldown)
            if (result.data.customerName || result.data.email) {
                (0, email_service_1.notifyLeadEmail)({
                    customerName: result.data.customerName || 'Customer',
                    phone: result.data.phone,
                    email: result.data.email,
                }).catch(() => { });
                const emailInfo = result.data.email ? `\n📧 <b>Email:</b> ${result.data.email}` : '';
                (0, telegram_service_1.notifyLeadTelegram)(result.data.phone, `🛒 <b>Customer on Order Page</b>\n\n👤 <b>Name:</b> ${result.data.customerName || 'Customer'}\n📱 <b>Phone:</b> <code>${result.data.phone}</code>${emailInfo}\n⏰ <b>Time:</b> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`).catch(() => { });
            }
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
    /**
     * Background lead alert (preserved for API compatibility, deduplicated)
     */
    fastify.post('/lead', { config: { rateLimit: { max: 5, timeWindow: '5 minutes' } } }, async (request, reply) => {
        return reply.send({ success: true });
    });
    fastify.post('/verify', { config: { rateLimit: { max: 10, timeWindow: '10 minutes' } } }, async (request, reply) => {
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