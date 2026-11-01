"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOrder = createOrder;
exports.expireStaleOrders = expireStaleOrders;
const client_1 = require("@prisma/client");
const telegram_service_1 = require("../../services/telegram.service");
const sheets_service_1 = require("../../services/sheets.service");
async function createOrder(prisma, data) {
    // Verify OTP session is valid and verified
    const session = await prisma.otpSession.findFirst({
        where: {
            id: data.otpSessionId,
            phone: data.phone,
            verified: true,
            expiresAt: { gt: new Date() },
        },
    });
    if (!session) {
        throw new Error('OTP_NOT_VERIFIED');
    }
    // Get product price from DB (never trust frontend price)
    const product = await prisma.product.findUnique({
        where: { id: data.productId },
    });
    if (!product)
        throw new Error('PRODUCT_NOT_FOUND');
    if (!product.inStock)
        throw new Error('OUT_OF_STOCK');
    // 90 second payment window
    const paymentExpiry = new Date(Date.now() + 90 * 1000);
    const order = await prisma.order.create({
        data: {
            customerName: data.customerName,
            phone: data.phone,
            productId: data.productId,
            totalAmount: product.price,
            streetAddress: data.streetAddress,
            city: data.city,
            pincode: data.pincode,
            otpSessionId: data.otpSessionId,
            status: client_1.OrderStatus.PAYMENT_PENDING,
            paymentExpiry,
        },
        include: { product: true },
    });
    // Async notifications - don't block response
    (0, telegram_service_1.notifyOrder)({
        id: order.id,
        customerName: order.customerName,
        phone: order.phone,
        weight: product.weight,
        price: order.totalAmount,
        status: 'PAYMENT_PENDING',
        city: order.city || '',
    }).catch(console.error);
    (0, sheets_service_1.appendOrderToSheet)({
        id: order.id,
        customerName: order.customerName,
        phone: order.phone,
        weight: product.weight,
        amount: order.totalAmount,
        status: 'PAYMENT_PENDING',
        city: order.city || '',
        createdAt: order.createdAt,
    }).catch(console.error);
    return order;
}
async function expireStaleOrders(prisma) {
    const result = await prisma.order.updateMany({
        where: {
            status: client_1.OrderStatus.PAYMENT_PENDING,
            paymentExpiry: { lt: new Date() },
        },
        data: { status: client_1.OrderStatus.PAYMENT_FAILED },
    });
    return result.count;
}
//# sourceMappingURL=orders.service.js.map