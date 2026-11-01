import { PrismaClient, OrderStatus } from '@prisma/client';
import { notifyOrder } from '../../services/telegram.service';
import { updateOrderInSheet } from '../../services/sheets.service';

export async function getDashboardStats(prisma: PrismaClient) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    ordersToday,
    revenueTodayAgg,
    pendingReview,
    paidOrders,
    failedOrders,
    outOfStock,
    totalOrders,
  ] = await Promise.all([
    prisma.order.count({ where: { createdAt: { gte: today } } }),
    prisma.order.aggregate({
      where: { createdAt: { gte: today }, status: OrderStatus.PAID },
      _sum: { totalAmount: true },
    }),
    prisma.order.count({ where: { status: OrderStatus.PAYMENT_REVIEW } }),
    prisma.order.count({ where: { status: OrderStatus.PAID } }),
    prisma.order.count({
      where: { status: { in: [OrderStatus.PAYMENT_FAILED, OrderStatus.CANCELLED] } },
    }),
    prisma.order.count({ where: { status: OrderStatus.OUT_OF_STOCK } }),
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

export async function getOrders(
  prisma: PrismaClient,
  filters: {
    search?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    page: number;
    limit: number;
  }
) {
  const where: Record<string, unknown> = {};

  if (filters.search) {
    where.OR = [
      { customerName: { contains: filters.search, mode: 'insensitive' } },
      { id: { contains: filters.search, mode: 'insensitive' } },
      { city: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  if (filters.status) where.status = filters.status as OrderStatus;

  if (filters.dateFrom || filters.dateTo) {
    const dateFilter: Record<string, Date> = {};
    if (filters.dateFrom) dateFilter.gte = new Date(filters.dateFrom);
    if (filters.dateTo) dateFilter.lte = new Date(filters.dateTo);
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

export async function updateOrderStatus(
  prisma: PrismaClient,
  orderId: string,
  status: OrderStatus,
  adminNotes?: string
) {
  const order = await prisma.order.update({
    where: { id: orderId },
    data: {
      status,
      adminNotes,
      ...(status === OrderStatus.PAID ? { paidAt: new Date() } : {}),
      ...(status === OrderStatus.PICKED_UP ? { pickedUpAt: new Date() } : {}),
    },
    include: { product: true },
  });

  notifyOrder({
    id: order.id,
    customerName: order.customerName,
    phone: order.phone,
    weight: order.product.weight,
    price: order.totalAmount,
    status,
    city: order.city || '',
  }).catch(console.error);

  updateOrderInSheet(orderId, status).catch(console.error);

  return { ...order, phone: order.phone.slice(0, 2) + '****' + order.phone.slice(-4) };
}

export async function exportOrdersCsv(
  prisma: PrismaClient,
  filters: { status?: string; dateFrom?: string; dateTo?: string }
): Promise<string> {
  const where: Record<string, unknown> = {};
  if (filters.status) where.status = filters.status as OrderStatus;
  if (filters.dateFrom || filters.dateTo) {
    const dateFilter: Record<string, Date> = {};
    if (filters.dateFrom) dateFilter.gte = new Date(filters.dateFrom);
    if (filters.dateTo) dateFilter.lte = new Date(filters.dateTo);
    where.createdAt = dateFilter;
  }

  const orders = await prisma.order.findMany({
    where,
    include: { product: true },
    orderBy: { createdAt: 'desc' },
  });

  const header = 'Order ID,Customer Name,Phone (Masked),Weight,Amount,Status,City,Street Address,Date\n';
  const rows = orders.map((o) =>
    [
      o.id,
      `"${o.customerName}"`,
      o.phone.slice(0, 2) + '****' + o.phone.slice(-4),
      o.product.weight,
      `₹${o.totalAmount}`,
      o.status,
      `"${o.city || ''}"`,
      `"${o.streetAddress || ''}"`,
      new Date(o.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    ].join(',')
  );

  return header + rows.join('\n');
}

export async function getDailyChartData(prisma: PrismaClient) {
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
