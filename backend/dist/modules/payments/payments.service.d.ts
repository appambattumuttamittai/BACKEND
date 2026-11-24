import { PrismaClient, OrderStatus } from '@prisma/client';
export declare function getRazorpayConfig(): {
    enabled: boolean;
    keyId: string;
};
export declare function createRazorpayOrder(prisma: PrismaClient, orderId: string): Promise<{
    keyId: string;
    razorpayOrderId: any;
    amount: any;
    currency: any;
    orderId: string;
    customerName: string;
    phone: string;
}>;
export declare function confirmOrderPaid(prisma: PrismaClient, orderId: string, razorpayPaymentId: string): Promise<{
    id: string;
    status: import(".prisma/client").$Enums.OrderStatus;
    paymentId: string;
}>;
export declare function verifyRazorpayPayment(prisma: PrismaClient, data: {
    orderId: string;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
}): Promise<{
    id: string;
    status: import(".prisma/client").$Enums.OrderStatus;
    paymentId: string;
}>;
export declare function handleRazorpayWebhook(prisma: PrismaClient, rawBody: string, signature: string | undefined, eventData: any): Promise<{
    success: boolean;
    orderId: any;
    paymentId: any;
    message?: undefined;
} | {
    success: boolean;
    message: string;
    orderId?: undefined;
    paymentId?: undefined;
}>;
export declare function markPaymentReview(prisma: PrismaClient, orderId: string): Promise<{
    id: string;
    status: OrderStatus;
}>;
