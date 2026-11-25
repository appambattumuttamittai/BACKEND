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
    }[];
    total: number;
    page: number;
    limit: number;
    pages: number;
}>;
export declare function updateOrderStatus(prisma: PrismaClient, orderId: string, status: OrderStatus, adminNotes?: string): Promise<{
    product: {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        weight: string;
        weightGrams: number;
        price: number;
        inStock: boolean;
    };
} & {
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
