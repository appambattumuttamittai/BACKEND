export declare function appendOrderToSheet(order: {
    id: string;
    customerName: string;
    phone: string;
    weight: string;
    amount: number;
    status: string;
    city: string;
    createdAt: Date;
}): Promise<void>;
export declare function updateOrderInSheet(orderId: string, status: string, orderData?: {
    customerName: string;
    phone: string;
    weight: string;
    amount: number;
    city: string;
    createdAt: Date;
}): Promise<void>;
