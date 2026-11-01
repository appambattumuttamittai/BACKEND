import { PrismaClient, OrderStatus } from '@prisma/client';
export declare function markPaymentReview(prisma: PrismaClient, orderId: string): Promise<{
    id: string;
    status: OrderStatus;
}>;
