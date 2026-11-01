import { z } from 'zod';
export declare const updateProductSchema: z.ZodObject<{
    price: z.ZodOptional<z.ZodNumber>;
    inStock: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    price?: number | undefined;
    inStock?: boolean | undefined;
}, {
    price?: number | undefined;
    inStock?: boolean | undefined;
}>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
