import { PrismaClient, OrderStatus } from '@prisma/client';
import { notifyOrder } from '../../services/telegram.service';
import { updateOrderInSheet } from '../../services/sheets.service';

export async function markPaymentReview(
  prisma: PrismaClient,
  orderId: string
): Promise<{ id: string; status: OrderStatus }> {
  // First, expire any stale PAYMENT_PENDING orders
  await prisma.order.updateMany({
    where: {
      status: OrderStatus.PAYMENT_PENDING,
      paymentExpiry: { lt: new Date() },
    },
    data: { status: OrderStatus.PAYMENT_FAILED },
  });

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { product: true },
  });

  if (!order) throw new Error('ORDER_NOT_FOUND');

  if (order.status === OrderStatus.PAYMENT_FAILED) {
    throw new Error('PAYMENT_EXPIRED');
  }

  if (order.status !== OrderStatus.PAYMENT_PENDING) {
    throw new Error(`INVALID_STATUS:${order.status}`);
  }

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: { status: OrderStatus.PAYMENT_REVIEW },
    include: { product: true },
  });

  notifyOrder({
    id: updated.id,
    customerName: updated.customerName,
    phone: updated.phone,
    weight: updated.product.weight,
    price: updated.totalAmount,
    status: 'PAYMENT_REVIEW',
    city: updated.city || '',
  }).catch(console.error);

  updateOrderInSheet(orderId, 'PAYMENT_REVIEW').catch(console.error);

  return { id: updated.id, status: updated.status };
}
