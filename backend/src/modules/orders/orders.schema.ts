import { z } from 'zod';

export const createOrderSchema = z.object({
  customerName: z.string().min(1, 'Name is required').max(100),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, 'Invalid Indian mobile number'),
  productId: z.string().min(1, 'Product is required'),
  otpSessionId: z.string().min(1, 'OTP verification required'),
  streetAddress: z.string().min(1, 'Street address is required').max(200),
  city: z.string().min(1, 'City is required').max(100),
  pincode: z.string().max(10).optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
