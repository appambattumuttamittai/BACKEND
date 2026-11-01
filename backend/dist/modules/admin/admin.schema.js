"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orderFiltersSchema = exports.updateOrderStatusSchema = void 0;
const zod_1 = require("zod");
exports.updateOrderStatusSchema = zod_1.z.object({
    status: zod_1.z.enum([
        'OTP_PENDING',
        'OTP_VERIFIED',
        'PAYMENT_PENDING',
        'PAYMENT_REVIEW',
        'PAID',
        'PAYMENT_FAILED',
        'OUT_OF_STOCK',
        'READY_FOR_PICKUP',
        'PICKED_UP',
        'CANCELLED',
    ]),
    adminNotes: zod_1.z.string().max(500).optional(),
});
exports.orderFiltersSchema = zod_1.z.object({
    search: zod_1.z.string().optional(),
    status: zod_1.z.string().optional(),
    dateFrom: zod_1.z.string().optional(),
    dateTo: zod_1.z.string().optional(),
    page: zod_1.z
        .string()
        .default('1')
        .transform((v) => parseInt(v, 10)),
    limit: zod_1.z
        .string()
        .default('20')
        .transform((v) => Math.min(parseInt(v, 10), 100)),
});
//# sourceMappingURL=admin.schema.js.map