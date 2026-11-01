import { z } from 'zod';

export const updateProductSchema = z.object({
  price: z.number().positive('Price must be positive').optional(),
  inStock: z.boolean().optional(),
});

export type UpdateProductInput = z.infer<typeof updateProductSchema>;
