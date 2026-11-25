"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyOtpSchema = exports.sendOtpSchema = void 0;
const zod_1 = require("zod");
exports.sendOtpSchema = zod_1.z.object({
    phone: zod_1.z
        .string()
        .regex(/^[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian mobile number'),
    email: zod_1.z
        .string()
        .email('Please enter a valid email address')
        .optional()
        .or(zod_1.z.literal('')),
    customerName: zod_1.z.string().optional(),
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
    email: zod_1.z
        .string()
        .email('Please enter a valid email address')
        .optional()
        .or(zod_1.z.literal('')),
});
//# sourceMappingURL=otp.schema.js.map