export declare function sendTelegramMessage(message: string): Promise<void>;
export declare function notifyOrderPending(order: {
    id: string;
    customerName: string;
    phone: string;
    weight: string;
    price: number;
    streetAddress: string;
    city: string;
    deliveryMethod: string;
}): Promise<void>;
export declare function notifyOrder(order: {
    id: string;
    customerName: string;
    phone: string;
    weight: string;
    price: number;
    status: string;
    city: string;
    streetAddress?: string;
    deliveryMethod?: string;
    transactionId?: string;
}): Promise<void>;
export declare function sendTelegramDocument(fileBuffer: Buffer, filename: string, caption?: string): Promise<void>;
