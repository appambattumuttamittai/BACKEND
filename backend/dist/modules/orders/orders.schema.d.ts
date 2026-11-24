import { z } from 'zod';
export declare const createOrderSchema: z.ZodObject<{
    customerName: z.ZodEffects<z.ZodString, string, string>;
    phone: z.ZodString;
    productId: z.ZodString;
    quantity: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    items: z.ZodOptional<z.ZodArray<z.ZodObject<{
        productId: z.ZodString;
        quantity: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        productId: string;
        quantity: number;
    }, {
        productId: string;
        quantity: number;
    }>, "many">>;
    otpSessionId: z.ZodString;
    streetAddress: z.ZodString;
    city: z.ZodString;
    pincode: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    phone: string;
    customerName: string;
    productId: string;
    quantity: number;
    otpSessionId: string;
    streetAddress: string;
    city: string;
    items?: {
        productId: string;
        quantity: number;
    }[] | undefined;
    pincode?: string | undefined;
}, {
    phone: string;
    customerName: string;
    productId: string;
    otpSessionId: string;
    streetAddress: string;
    city: string;
    quantity?: number | undefined;
    items?: {
        productId: string;
        quantity: number;
    }[] | undefined;
    pincode?: string | undefined;
}>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
