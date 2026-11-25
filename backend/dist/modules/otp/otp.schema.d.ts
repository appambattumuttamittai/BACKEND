import { z } from 'zod';
export declare const sendOtpSchema: z.ZodObject<{
    phone: z.ZodString;
    email: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    customerName: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    phone: string;
    email?: string | undefined;
    customerName?: string | undefined;
}, {
    phone: string;
    email?: string | undefined;
    customerName?: string | undefined;
}>;
export declare const verifyOtpSchema: z.ZodObject<{
    phone: z.ZodString;
    code: z.ZodString;
    sessionId: z.ZodOptional<z.ZodString>;
    email: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
}, "strip", z.ZodTypeAny, {
    code: string;
    phone: string;
    email?: string | undefined;
    sessionId?: string | undefined;
}, {
    code: string;
    phone: string;
    email?: string | undefined;
    sessionId?: string | undefined;
}>;
export type SendOtpInput = z.infer<typeof sendOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
