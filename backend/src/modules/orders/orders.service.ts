import { PrismaClient, OrderStatus } from '@prisma/client';
import { notifyOrder } from '../../services/telegram.service';
import { appendOrderToSheet } from '../../services/sheets.service';

export async function createOrder(
  prisma: PrismaClient,
  data: {
    customerName: string;
    phone: string;
    productId: string;
    quantity?: number;
    items?: Array<{ productId: string; quantity: number }>;
    otpSessionId: string;
    streetAddress: string;
    city: string;
    pincode?: string;
  }
) {
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

  let primaryProductId: string;
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
      if (!p) throw new Error('PRODUCT_NOT_FOUND');
      if (!p.inStock) throw new Error('OUT_OF_STOCK');
      const qty = item.quantity > 0 ? item.quantity : 1;
      resolvedItems.push({ product: p, quantity: qty });
      totalAmount += p.price * qty;
      totalQuantity += qty;
    }
    primaryProductId = resolvedItems[0].product.id;
    itemsSummary = resolvedItems.map((r) => `${r.product.weight} × ${r.quantity}`).join(', ');
  } else {
    // Get product price from DB (never trust frontend price)
    const product = await prisma.product.findFirst({
      where: {
        OR: [
          { id: data.productId },
          { weight: data.productId },
        ],
      },
    });
    if (!product) throw new Error('PRODUCT_NOT_FOUND');
    if (!product.inStock) throw new Error('OUT_OF_STOCK');
    const qty = data.quantity && data.quantity > 0 ? data.quantity : 1;
    primaryProductId = product.id;
    totalQuantity = qty;
    totalAmount = product.price * qty;
    itemsSummary = `${product.weight} × ${qty}`;
  }

  // 90 second payment window
  const paymentExpiry = new Date(Date.now() + 90 * 1000);

  const order = await prisma.order.create({
    data: {
      customerName: data.customerName,
      phone: data.phone,
      productId: primaryProductId,
      quantity: totalQuantity,
      totalAmount,
      streetAddress: data.streetAddress,
      city: data.city,
      pincode: data.pincode,
      otpSessionId: data.otpSessionId,
      status: OrderStatus.PAYMENT_PENDING,
      paymentExpiry,
      adminNotes: itemsSummary,
    },
    include: { product: true },
  });

  // Async notifications - don't block response
  notifyOrder({
    id: order.id,
    customerName: order.customerName,
    phone: order.phone,
    weight: itemsSummary,
    price: order.totalAmount,
    status: 'PAYMENT_PENDING',
    city: order.city || '',
  }).catch(console.error);

  appendOrderToSheet({
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

export async function expireStaleOrders(prisma: PrismaClient): Promise<number> {
  const result = await prisma.order.updateMany({
    where: {
      status: OrderStatus.PAYMENT_PENDING,
      paymentExpiry: { lt: new Date() },
    },
    data: { status: OrderStatus.PAYMENT_FAILED },
  });
  return result.count;
}
