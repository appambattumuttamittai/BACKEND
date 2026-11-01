import { z } from 'zod';

export const updateOrderStatusSchema = z.object({
  status: z.enum([
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
  adminNotes: z.string().max(500).optional(),
});

export const orderFiltersSchema = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z
    .string()
    .default('1')
    .transform((v) => parseInt(v, 10)),
  limit: z
    .string()
    .default('20')
    .transform((v) => Math.min(parseInt(v, 10), 100)),
});
