"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initiateOtp = initiateOtp;
exports.validateOtp = validateOtp;
const otp_1 = require("../../services/otp");
const email_service_1 = require("../../services/email.service");
const config_1 = require("../../config");
async function initiateOtp(prisma, phone, email, customerName) {
    // Check recent sends - prevent spam (allow up to 5 sends in 5 minutes)
    const recent = await prisma.otpSession.count({
        where: {
            phone,
            createdAt: { gt: new Date(Date.now() - 5 * 60 * 1000) },
        },
    });
    if (recent >= 5) {
        throw new Error('TOO_MANY_REQUESTS');
    }
    // Generate a random 6-digit OTP code valid for 10 minutes
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    // Create session in Neon DB with 10-minute expiry
    const session = await prisma.otpSession.create({
        data: {
            phone,
            email: email || null,
            otpCode: code,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        },
    });
    // Persist OTP code in Neon DB AppConfig
    const otpPayload = {
        code,
        phone,
        email: email || '',
        expiresAt: Date.now() + 10 * 60 * 1000,
    };
    await prisma.appConfig.upsert({
        where: { key: `otp:${session.id}` },
        create: {
            key: `otp:${session.id}`,
            value: JSON.stringify(otpPayload),
        },
        update: {
            value: JSON.stringify(otpPayload),
        },
    });
    console.log(`[OTP Service] 🔑 Generated 6-digit OTP for ${email || phone}: ${code} (Session: ${session.id}, Expires in 10 mins)`);
    // If customer provided email, send OTP directly to their Gmail
    if (email && email.trim().length > 0) {
        await (0, email_service_1.sendCustomerOtpEmail)({
            email: email.trim(),
            customerName,
            code,
        });
    }
    else {
        // Fallback to SMS provider if no email provided
        try {
            await (0, otp_1.sendOtp)(phone);
        }
        catch (err) {
            console.warn('[OTP Service] Provider SMS send failed (non-fatal, session created):', err.message);
        }
    }
    return session.id;
}
async function validateOtp(prisma, phone, code, sessionId) {
    const config = (0, config_1.getConfig)();
    // 1. Support Firebase / Environment Test OTP if configured
    if (config.FIREBASE_TEST_MODE &&
        config.FIREBASE_TEST_OTP &&
        code === config.FIREBASE_TEST_OTP) {
        if (sessionId) {
            await prisma.otpSession
                .update({
                where: { id: sessionId },
                data: { verified: true },
            })
                .catch(() => { });
        }
        return { valid: true, sessionId: sessionId || null };
    }
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
        // 2. Verify against Neon DB AppConfig stored OTP
        let isValid = false;
        try {
            const configOtp = await prisma.appConfig.findUnique({
                where: { key: `otp:${sessionId}` },
            });
            if (configOtp) {
                const data = JSON.parse(configOtp.value);
                if (data.code === code && Date.now() <= data.expiresAt) {
                    isValid = true;
                }
            }
        }
        catch (err) {
            console.error('[OTP Validate] Error checking AppConfig OTP:', err);
        }
        // 3. Fallback to provider verify if not verified via DB OTP
        if (!isValid) {
            try {
                isValid = await (0, otp_1.verifyOtp)(phone, code, sessionId);
            }
            catch {
                isValid = false;
            }
        }
        if (!isValid)
            return { valid: false, sessionId };
        // Mark session verified in DB and store permanent audit in AppConfig
        await prisma.otpSession.update({
            where: { id: sessionId },
            data: { verified: true },
        });
        await prisma.appConfig
            .upsert({
            where: { key: `otp_history:${sessionId}` },
            create: {
                key: `otp_history:${sessionId}`,
                value: JSON.stringify({
                    sessionId,
                    phone,
                    code,
                    verified: true,
                    verifiedAt: new Date().toISOString(),
                }),
            },
            update: {
                value: JSON.stringify({
                    sessionId,
                    phone,
                    code,
                    verified: true,
                    verifiedAt: new Date().toISOString(),
                }),
            },
        })
            .catch(() => { });
        await prisma.appConfig
            .delete({
            where: { key: `otp:${sessionId}` },
        })
            .catch(() => { });
        return { valid: true, sessionId };
    }
    // Fallback if no sessionId provided
    const verified = await (0, otp_1.verifyOtp)(phone, code, sessionId);
    return { valid: verified, sessionId: sessionId || null };
}
//# sourceMappingURL=otp.service.js.map