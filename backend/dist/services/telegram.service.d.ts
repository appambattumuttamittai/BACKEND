export declare function sendTelegramMessage(message: string): Promise<void>;
export declare function notifyOrder(order: {
    id: string;
    customerName: string;
    phone: string;
    weight: string;
    price: number;
    status: string;
    city?: string;
}): Promise<void>;
