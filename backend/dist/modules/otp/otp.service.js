"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initiateOtp = initiateOtp;
exports.validateOtp = validateOtp;
const otp_1 = require("../../services/otp");
async function initiateOtp(prisma, phone) {
    // Check recent sends - prevent spam
    const recent = await prisma.otpSession.count({
        where: {
            phone,
            createdAt: { gt: new Date(Date.now() - 5 * 60 * 1000) },
        },
    });
    if (recent >= 3) {
        throw new Error('TOO_MANY_REQUESTS');
    }
    await (0, otp_1.sendOtp)(phone);
    const session = await prisma.otpSession.create({
        data: {
            phone,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        },
    });
    return session.id;
}
async function validateOtp(prisma, phone, code, sessionId) {
    if (sessionId) {
        const session = await prisma.otpSession.findFirst({
            where: {
                id: sessionId,
                phone,
                expiresAt: { gt: new Date() },
                verified: false,
            },
        });
        if (!session)
            return { valid: false, sessionId: null };
        if (session.attempts >= 5)
            return { valid: false, sessionId: null };
        await prisma.otpSession.update({
            where: { id: sessionId },
            data: { attempts: { increment: 1 } },
        });
    }
    const verified = await (0, otp_1.verifyOtp)(phone, code, sessionId);
    if (!verified)
        return { valid: false, sessionId: sessionId || null };
    if (sessionId) {
        await prisma.otpSession.update({
            where: { id: sessionId },
            data: { verified: true },
        });
    }
    return { valid: true, sessionId: sessionId || null };
}
//# sourceMappingURL=otp.service.js.map