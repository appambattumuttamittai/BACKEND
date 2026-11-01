import { z } from 'zod';
export declare const createOrderSchema: z.ZodObject<{
    customerName: z.ZodString;
    phone: z.ZodString;
    productId: z.ZodString;
    otpSessionId: z.ZodString;
    streetAddress: z.ZodString;
    city: z.ZodString;
    pincode: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    phone: string;
    customerName: string;
    productId: string;
    otpSessionId: string;
    streetAddress: string;
    city: string;
    pincode?: string | undefined;
}, {
    phone: string;
    customerName: string;
    productId: string;
    otpSessionId: string;
    streetAddress: string;
    city: string;
    pincode?: string | undefined;
}>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
