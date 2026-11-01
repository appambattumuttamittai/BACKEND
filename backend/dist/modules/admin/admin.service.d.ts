import { PrismaClient, OrderStatus } from '@prisma/client';
export declare function getDashboardStats(prisma: PrismaClient): Promise<{
    ordersToday: number;
    revenueToday: number;
    pendingReview: number;
    paidOrders: number;
    failedOrders: number;
    outOfStock: number;
    totalOrders: number;
}>;
export declare function getOrders(prisma: PrismaClient, filters: {
    search?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    page: number;
    limit: number;
}): Promise<{
    orders: {
        phone: string;
        product: {
            id: string;
            createdAt: Date;
            weight: string;
            weightGrams: number;
            price: number;
            inStock: boolean;
            updatedAt: Date;
        };
        status: import(".prisma/client").$Enums.OrderStatus;
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
    }[];
    total: number;
    page: number;
    limit: number;
    pages: number;
}>;
export declare function updateOrderStatus(prisma: PrismaClient, orderId: string, status: OrderStatus, adminNotes?: string): Promise<{
    phone: string;
    product: {
        id: string;
        createdAt: Date;
        weight: string;
        weightGrams: number;
        price: number;
        inStock: boolean;
        updatedAt: Date;
    };
    status: import(".prisma/client").$Enums.OrderStatus;
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
export declare function exportOrdersCsv(prisma: PrismaClient, filters: {
    status?: string;
    dateFrom?: string;
    dateTo?: string;
}): Promise<string>;
export declare function getDailyChartData(prisma: PrismaClient): Promise<{
    status: import(".prisma/client").$Enums.OrderStatus;
    product: {
        weight: string;
        weightGrams: number;
    };
    createdAt: Date;
    totalAmount: number;
}[]>;
