"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOrderSchema = void 0;
const zod_1 = require("zod");
exports.createOrderSchema = zod_1.z.object({
    customerName: zod_1.z.string().min(1, 'Name is required').max(100),
    phone: zod_1.z
        .string()
        .regex(/^[6-9]\d{9}$/, 'Invalid Indian mobile number'),
    productId: zod_1.z.string().min(1, 'Product is required'),
    otpSessionId: zod_1.z.string().min(1, 'OTP verification required'),
    streetAddress: zod_1.z.string().min(1, 'Street address is required').max(200),
    city: zod_1.z.string().min(1, 'City is required').max(100),
    pincode: zod_1.z.string().max(10).optional(),
});
//# sourceMappingURL=orders.schema.js.map