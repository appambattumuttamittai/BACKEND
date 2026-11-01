import { PrismaClient } from '@prisma/client';
export declare function createOrder(prisma: PrismaClient, data: {
    customerName: string;
    phone: string;
    productId: string;
    otpSessionId: string;
    streetAddress: string;
    city: string;
    pincode?: string;
}): Promise<{
    product: {
        id: string;
        createdAt: Date;
        weight: string;
        weightGrams: number;
        price: number;
        inStock: boolean;
        updatedAt: Date;
    };
} & {
    status: import(".prisma/client").$Enums.OrderStatus;
    phone: string;
    id: string;
    createdAt: Date;
    customerName: string;
    productId: string;
    otpSessionId: string | null;
    streetAddress: string | null;
    city: string | null;
    pincode: string | null;
    updatedAt: Date;
    quantity: number;
    totalAmount: number;
    paymentExpiry: Date | null;
    paidAt: Date | null;
    pickedUpAt: Date | null;
    adminNotes: string | null;
}>;
export declare function expireStaleOrders(prisma: PrismaClient): Promise<number>;
