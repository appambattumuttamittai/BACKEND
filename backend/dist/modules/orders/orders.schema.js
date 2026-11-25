"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOrderSchema = void 0;
const zod_1 = require("zod");
exports.createOrderSchema = zod_1.z.object({
    customerName: zod_1.z
        .string()
        .min(2, 'Name must be at least 2 characters')
        .max(100)
        .refine((val) => !/[0-9]/.test(val), { message: 'Name cannot contain numbers' }),
    phone: zod_1.z
        .string()
        .regex(/^[6-9]\d{9}$/, 'Invalid Indian mobile number'),
    email: zod_1.z.string().email().optional().or(zod_1.z.literal('')),
    productId: zod_1.z.string().min(1, 'Product is required'),
    quantity: zod_1.z.number().int().positive().optional().default(1),
    items: zod_1.z.array(zod_1.z.object({
        productId: zod_1.z.string(),
        quantity: zod_1.z.number().int().positive(),
    })).optional(),
    otpSessionId: zod_1.z.string().min(1, 'OTP verification required'),
    streetAddress: zod_1.z.string().min(1, 'Street address is required').max(200),
    city: zod_1.z.string().min(1, 'City is required').max(100),
    pincode: zod_1.z.string().max(10).optional(),
});
//# sourceMappingURL=orders.schema.js.map