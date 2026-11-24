import { z } from 'zod';

export const createOrderSchema = z.object({
  customerName: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100)
    .refine((val) => !/[0-9]/.test(val), { message: 'Name cannot contain numbers' }),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, 'Invalid Indian mobile number'),
  productId: z.string().min(1, 'Product is required'),
  quantity: z.number().int().positive().optional().default(1),
  items: z.array(
    z.object({
      productId: z.string(),
      quantity: z.number().int().positive(),
    })
  ).optional(),
  otpSessionId: z.string().min(1, 'OTP verification required'),
  streetAddress: z.string().min(1, 'Street address is required').max(200),
  city: z.string().min(1, 'City is required').max(100),
  pincode: z.string().max(10).optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
