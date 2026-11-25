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
    // Prevent OTP session replay if order was already confirmed/paid
    const alreadyPaidOrder = await prisma.order.findFirst({
        where: {
            otpSessionId: data.otpSessionId,
            status: client_1.OrderStatus.PAID,
        },
    });
    if (alreadyPaidOrder) {
        throw new Error('OTP_NOT_VERIFIED');
    }
    // Idempotency: prevent duplicate/fake orders if user double-clicks or taps multiple times
    const existingOrder = await prisma.order.findFirst({
        where: {
            otpSessionId: data.otpSessionId,
            status: client_1.OrderStatus.PAYMENT_PENDING,
            paymentExpiry: { gt: new Date() },
        },
        include: { product: true },
    });
    if (existingOrder) {
        return {
            ...existingOrder,
            itemsSummary: existingOrder.adminNotes || existingOrder.product.weight,
        };
    }
    let primaryProductId;
    let totalQuantity = 0;
    let totalAmount = 0;
    let itemsSummary = '';
    if (data.items && data.items.length > 0) {
        const resolvedItems = [];
        for (const item of data.items) {
            const p = await prisma.product.findFirst({
                where: {
                    OR: [{ id: item.productId }, { weight: item.productId }],
                },
            });
            if (!p)
                throw new Error('PRODUCT_NOT_FOUND');
            if (!p.inStock)
                throw new Error('OUT_OF_STOCK');
            const qty = item.quantity > 0 ? item.quantity : 1;
            resolvedItems.push({ product: p, quantity: qty });
            totalAmount += p.price * qty;
            totalQuantity += qty;
        }
        primaryProductId = resolvedItems[0].product.id;
        itemsSummary = resolvedItems.map((r) => `${r.product.weight} × ${r.quantity}`).join(', ');
    }
    else {
        // Get product price from DB (never trust frontend price)
        const product = await prisma.product.findFirst({
            where: {
                OR: [
                    { id: data.productId },
                    { weight: data.productId },
                ],
            },
        });
        if (!product)
            throw new Error('PRODUCT_NOT_FOUND');
        if (!product.inStock)
            throw new Error('OUT_OF_STOCK');
        const qty = data.quantity && data.quantity > 0 ? data.quantity : 1;
        primaryProductId = product.id;
        totalQuantity = qty;
        totalAmount = product.price * qty;
        itemsSummary = `${product.weight} × ${qty}`;
    }
    // 30 minute payment window
    const paymentExpiry = new Date(Date.now() + 30 * 60 * 1000);
    const customerEmail = data.email || session?.email || null;
    const verifiedOtp = session?.otpCode || null;
    const order = await prisma.order.create({
        data: {
            customerName: data.customerName,
            phone: data.phone,
            email: customerEmail,
            otpCode: verifiedOtp,
            productId: primaryProductId,
            quantity: totalQuantity,
            totalAmount,
            streetAddress: data.streetAddress,
            city: data.city,
            pincode: data.pincode || '605602',
            otpSessionId: data.otpSessionId,
            status: client_1.OrderStatus.PAYMENT_PENDING,
            paymentExpiry,
            adminNotes: itemsSummary,
        },
        include: { product: true },
    });
    // Persistent backup of order record in AppConfig
    await prisma.appConfig.upsert({
        where: { key: `order_meta:${order.id}` },
        create: {
            key: `order_meta:${order.id}`,
            value: JSON.stringify({
                orderId: order.id,
                customerName: order.customerName,
                phone: order.phone,
                email: customerEmail,
                otpCode: verifiedOtp,
                totalAmount,
                createdAt: new Date().toISOString(),
            }),
        },
        update: {
            value: JSON.stringify({
                orderId: order.id,
                customerName: order.customerName,
                phone: order.phone,
                email: customerEmail,
                otpCode: verifiedOtp,
                totalAmount,
                updatedAt: new Date().toISOString(),
            }),
        },
    }).catch(() => { });
    // Async notifications - don't block response
    const isPickup = data.streetAddress?.toLowerCase().includes('pick up') ||
        data.streetAddress?.toLowerCase().includes('store');
    const deliveryText = isPickup
        ? '🏬 Store Pickup (Villupuram Railway Station)'
        : '🚚 Home Delivery (Within Villupuram City)';
    (0, telegram_service_1.notifyOrderPending)({
        id: order.id,
        customerName: order.customerName,
        phone: order.phone,
        weight: itemsSummary,
        price: order.totalAmount,
        streetAddress: order.streetAddress || '',
        city: order.city || '',
        deliveryMethod: deliveryText,
    }).catch(console.error);
    (0, sheets_service_1.appendOrderToSheet)({
        id: order.id,
        customerName: order.customerName,
        phone: order.phone,
        weight: itemsSummary,
        amount: order.totalAmount,
        status: 'PAYMENT_PENDING',
        city: order.city || '',
        createdAt: order.createdAt,
    }).catch(console.error);
    return { ...order, itemsSummary };
}
let lastExpirationCheck = 0;
async function expireStaleOrders(prisma) {
    const now = Date.now();
    if (now - lastExpirationCheck < 30000) {
        return 0; // Throttled to avoid DB write-lock contention under heavy concurrency
    }
    lastExpirationCheck = now;
    try {
        const result = await prisma.order.updateMany({
            where: {
                status: client_1.OrderStatus.PAYMENT_PENDING,
                paymentExpiry: { lt: new Date() },
            },
            data: { status: client_1.OrderStatus.PAYMENT_FAILED },
        });
        return result.count;
    }
    catch (err) {
        console.error('Error expiring stale orders:', err);
        return 0;
    }
}
//# sourceMappingURL=orders.service.js.map