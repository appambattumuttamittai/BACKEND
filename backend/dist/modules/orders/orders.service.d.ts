import { PrismaClient } from '@prisma/client';
export declare function createOrder(prisma: PrismaClient, data: {
    customerName: string;
    phone: string;
    email?: string;
    productId: string;
    quantity?: number;
    items?: Array<{
        productId: string;
        quantity: number;
    }>;
    otpSessionId: string;
    streetAddress: string;
    city: string;
    pincode?: string;
}): Promise<{
    itemsSummary: string;
    product: {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        weight: string;
        weightGrams: number;
        price: number;
        inStock: boolean;
    };
    status: import(".prisma/client").$Enums.OrderStatus;
    phone: string;
    email: string | null;
    customerName: string;
    id: string;
    otpCode: string | null;
    createdAt: Date;
    updatedAt: Date;
    productId: string;
    quantity: number;
    otpSessionId: string | null;
    streetAddress: string | null;
    city: string | null;
    pincode: string | null;
    totalAmount: number;
    paymentExpiry: Date | null;
    paidAt: Date | null;
    pickedUpAt: Date | null;
    adminNotes: string | null;
}>;
export declare function expireStaleOrders(prisma: PrismaClient): Promise<number>;
