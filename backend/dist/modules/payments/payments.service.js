"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markPaymentReview = markPaymentReview;
const client_1 = require("@prisma/client");
const telegram_service_1 = require("../../services/telegram.service");
const sheets_service_1 = require("../../services/sheets.service");
async function markPaymentReview(prisma, orderId) {
    // First, expire any stale PAYMENT_PENDING orders
    await prisma.order.updateMany({
        where: {
            status: client_1.OrderStatus.PAYMENT_PENDING,
            paymentExpiry: { lt: new Date() },
        },
        data: { status: client_1.OrderStatus.PAYMENT_FAILED },
    });
    const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { product: true },
    });
    if (!order)
        throw new Error('ORDER_NOT_FOUND');
    if (order.status === client_1.OrderStatus.PAYMENT_FAILED) {
        throw new Error('PAYMENT_EXPIRED');
    }
    if (order.status !== client_1.OrderStatus.PAYMENT_PENDING) {
        throw new Error(`INVALID_STATUS:${order.status}`);
    }
    const updated = await prisma.order.update({
        where: { id: orderId },
        data: { status: client_1.OrderStatus.PAYMENT_REVIEW },
        include: { product: true },
    });
    (0, telegram_service_1.notifyOrder)({
        id: updated.id,
        customerName: updated.customerName,
        phone: updated.phone,
        weight: updated.product.weight,
        price: updated.totalAmount,
        status: 'PAYMENT_REVIEW',
        city: updated.city || '',
    }).catch(console.error);
    (0, sheets_service_1.updateOrderInSheet)(orderId, 'PAYMENT_REVIEW').catch(console.error);
    return { id: updated.id, status: updated.status };
}
//# sourceMappingURL=payments.service.js.map