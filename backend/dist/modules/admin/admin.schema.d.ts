import { z } from 'zod';
export declare const updateOrderStatusSchema: z.ZodObject<{
    status: z.ZodEnum<["OTP_PENDING", "OTP_VERIFIED", "PAYMENT_PENDING", "PAYMENT_REVIEW", "PAID", "PAYMENT_FAILED", "OUT_OF_STOCK", "READY_FOR_PICKUP", "PICKED_UP", "CANCELLED"]>;
    adminNotes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "PAYMENT_PENDING" | "PAYMENT_REVIEW" | "PAID" | "PAYMENT_FAILED" | "READY_FOR_PICKUP" | "PICKED_UP" | "CANCELLED" | "OUT_OF_STOCK" | "OTP_PENDING" | "OTP_VERIFIED";
    adminNotes?: string | undefined;
}, {
    status: "PAYMENT_PENDING" | "PAYMENT_REVIEW" | "PAID" | "PAYMENT_FAILED" | "READY_FOR_PICKUP" | "PICKED_UP" | "CANCELLED" | "OUT_OF_STOCK" | "OTP_PENDING" | "OTP_VERIFIED";
    adminNotes?: string | undefined;
}>;
export declare const orderFiltersSchema: z.ZodObject<{
    search: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodString>;
    dateFrom: z.ZodOptional<z.ZodString>;
    dateTo: z.ZodOptional<z.ZodString>;
    page: z.ZodEffects<z.ZodDefault<z.ZodString>, number, string | undefined>;
    limit: z.ZodEffects<z.ZodDefault<z.ZodString>, number, string | undefined>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    status?: string | undefined;
    search?: string | undefined;
    dateFrom?: string | undefined;
    dateTo?: string | undefined;
}, {
    status?: string | undefined;
    search?: string | undefined;
    dateFrom?: string | undefined;
    dateTo?: string | undefined;
    page?: string | undefined;
    limit?: string | undefined;
}>;
