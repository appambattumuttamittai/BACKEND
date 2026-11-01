"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardStats = getDashboardStats;
exports.getOrders = getOrders;
exports.updateOrderStatus = updateOrderStatus;
exports.exportOrdersCsv = exportOrdersCsv;
exports.getDailyChartData = getDailyChartData;
const client_1 = require("@prisma/client");
const telegram_service_1 = require("../../services/telegram.service");
const sheets_service_1 = require("../../services/sheets.service");
async function getDashboardStats(prisma) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [ordersToday, revenueTodayAgg, pendingReview, paidOrders, failedOrders, outOfStock, totalOrders,] = await Promise.all([
        prisma.order.count({ where: { createdAt: { gte: today } } }),
        prisma.order.aggregate({
            where: { createdAt: { gte: today }, status: client_1.OrderStatus.PAID },
            _sum: { totalAmount: true },
        }),
        prisma.order.count({ where: { status: client_1.OrderStatus.PAYMENT_REVIEW } }),
        prisma.order.count({ where: { status: client_1.OrderStatus.PAID } }),
        prisma.order.count({
            where: { status: { in: [client_1.OrderStatus.PAYMENT_FAILED, client_1.OrderStatus.CANCELLED] } },
        }),
        prisma.order.count({ where: { status: client_1.OrderStatus.OUT_OF_STOCK } }),
        prisma.order.count(),
    ]);
    return {
        ordersToday,
        revenueToday: revenueTodayAgg._sum.totalAmount || 0,
        pendingReview,
        paidOrders,
        failedOrders,
        outOfStock,
        totalOrders,
    };
}
async function getOrders(prisma, filters) {
    const where = {};
    if (filters.search) {
        where.OR = [
            { customerName: { contains: filters.search, mode: 'insensitive' } },
            { id: { contains: filters.search, mode: 'insensitive' } },
            { city: { contains: filters.search, mode: 'insensitive' } },
        ];
    }
    if (filters.status)
        where.status = filters.status;
    if (filters.dateFrom || filters.dateTo) {
        const dateFilter = {};
        if (filters.dateFrom)
            dateFilter.gte = new Date(filters.dateFrom);
        if (filters.dateTo)
            dateFilter.lte = new Date(filters.dateTo);
        where.createdAt = dateFilter;
    }
    const [orders, total] = await Promise.all([
        prisma.order.findMany({
            where,
            include: { product: true },
            orderBy: { createdAt: 'desc' },
            skip: (filters.page - 1) * filters.limit,
            take: filters.limit,
        }),
        prisma.order.count({ where }),
    ]);
    const safeOrders = orders.map((o) => ({
        ...o,
        phone: o.phone.slice(0, 2) + '****' + o.phone.slice(-4),
    }));
    return {
        orders: safeOrders,
        total,
        page: filters.page,
        limit: filters.limit,
        pages: Math.ceil(total / filters.limit),
    };
}
async function updateOrderStatus(prisma, orderId, status, adminNotes) {
    const order = await prisma.order.update({
        where: { id: orderId },
        data: {
            status,
            adminNotes,
            ...(status === client_1.OrderStatus.PAID ? { paidAt: new Date() } : {}),
            ...(status === client_1.OrderStatus.PICKED_UP ? { pickedUpAt: new Date() } : {}),
        },
        include: { product: true },
    });
    (0, telegram_service_1.notifyOrder)({
        id: order.id,
        customerName: order.customerName,
        phone: order.phone,
        weight: order.product.weight,
        price: order.totalAmount,
        status,
        city: order.city || '',
    }).catch(console.error);
    (0, sheets_service_1.updateOrderInSheet)(orderId, status).catch(console.error);
    return { ...order, phone: order.phone.slice(0, 2) + '****' + order.phone.slice(-4) };
}
async function exportOrdersCsv(prisma, filters) {
    const where = {};
    if (filters.status)
        where.status = filters.status;
    if (filters.dateFrom || filters.dateTo) {
        const dateFilter = {};
        if (filters.dateFrom)
            dateFilter.gte = new Date(filters.dateFrom);
        if (filters.dateTo)
            dateFilter.lte = new Date(filters.dateTo);
        where.createdAt = dateFilter;
    }
    const orders = await prisma.order.findMany({
        where,
        include: { product: true },
        orderBy: { createdAt: 'desc' },
    });
    const header = 'Order ID,Customer Name,Phone (Masked),Weight,Amount,Status,City,Street Address,Date\n';
    const rows = orders.map((o) => [
        o.id,
        `"${o.customerName}"`,
        o.phone.slice(0, 2) + '****' + o.phone.slice(-4),
        o.product.weight,
        `₹${o.totalAmount}`,
        o.status,
        `"${o.city || ''}"`,
        `"${o.streetAddress || ''}"`,
        new Date(o.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    ].join(','));
    return header + rows.join('\n');
}
async function getDailyChartData(prisma) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    const orders = await prisma.order.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        select: {
            createdAt: true,
            totalAmount: true,
            status: true,
            product: { select: { weight: true, weightGrams: true } },
        },
    });
    return orders;
}
//# sourceMappingURL=admin.service.js.map