"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyOtpSchema = exports.sendOtpSchema = void 0;
const zod_1 = require("zod");
exports.sendOtpSchema = zod_1.z.object({
    phone: zod_1.z
        .string()
        .regex(/^[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian mobile number'),
});
exports.verifyOtpSchema = zod_1.z.object({
    phone: zod_1.z
        .string()
        .regex(/^[6-9]\d{9}$/, 'Invalid phone number'),
    code: zod_1.z
        .string()
        .length(6)
        .regex(/^\d{6}$/, 'OTP must be 6 digits'),
    sessionId: zod_1.z.string().optional(),
});
//# sourceMappingURL=otp.schema.js.map