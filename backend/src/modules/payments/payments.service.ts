import crypto from 'crypto';
import axios from 'axios';
import { PrismaClient, OrderStatus } from '@prisma/client';
import { notifyOrder, sendTelegramDocument } from '../../services/telegram.service';
import { updateOrderInSheet } from '../../services/sheets.service';
import { generateOrderInvoicePDF } from '../../services/pdf.service';
import { getConfig } from '../../config';

export function getRazorpayConfig() {
  const config = getConfig();
  const isConfigured = Boolean(config.RAZORPAY_KEY_ID && config.RAZORPAY_KEY_SECRET);
  return {
    enabled: isConfigured,
    keyId: config.RAZORPAY_KEY_ID || '',
  };
}

export async function createRazorpayOrder(
  prisma: PrismaClient,
  orderId: string
) {
  const config = getConfig();
  if (!config.RAZORPAY_KEY_ID || !config.RAZORPAY_KEY_SECRET) {
    throw new Error('RAZORPAY_NOT_CONFIGURED');
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { product: true },
  });

  if (!order) throw new Error('ORDER_NOT_FOUND');
  if (order.status === OrderStatus.PAID) throw new Error('ALREADY_PAID');

  const auth = Buffer.from(
    `${config.RAZORPAY_KEY_ID}:${config.RAZORPAY_KEY_SECRET}`
  ).toString('base64');

  const response = await axios.post(
    'https://api.razorpay.com/v1/orders',
    {
      amount: Math.round(order.totalAmount * 100), // paise
      currency: 'INR',
      receipt: `rcpt_${order.id.slice(-20)}`,
      notes: {
        orderId: order.id,
        customerName: order.customerName,
        phone: order.phone,
      },
    },
    {
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    }
  );

  return {
    keyId: config.RAZORPAY_KEY_ID,
    razorpayOrderId: response.data.id,
    amount: response.data.amount,
    currency: response.data.currency,
    orderId: order.id,
    customerName: order.customerName,
    phone: order.phone,
  };
}

export async function verifyRazorpayPayment(
  prisma: PrismaClient,
  data: {
    orderId: string;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }
) {
  const config = getConfig();
  if (!config.RAZORPAY_KEY_SECRET) {
    throw new Error('RAZORPAY_NOT_CONFIGURED');
  }

  // Verify HMAC SHA256 signature
  const expectedSignature = crypto
    .createHmac('sha256', config.RAZORPAY_KEY_SECRET)
    .update(`${data.razorpayOrderId}|${data.razorpayPaymentId}`)
    .digest('hex');

  if (expectedSignature !== data.razorpaySignature) {
    throw new Error('INVALID_PAYMENT_SIGNATURE');
  }

  const order = await prisma.order.findUnique({
    where: { id: data.orderId },
    include: { product: true },
  });

  if (!order) throw new Error('ORDER_NOT_FOUND');

  const notesAppend = `Razorpay: ${data.razorpayPaymentId}`;
  const updated = await prisma.order.update({
    where: { id: data.orderId },
    data: {
      status: OrderStatus.PAID,
      paidAt: new Date(),
      adminNotes: order.adminNotes ? `${order.adminNotes} | ${notesAppend}` : notesAppend,
    },
    include: { product: true },
  });

  // Async notifications
  notifyOrder({
    id: updated.id,
    customerName: updated.customerName,
    phone: updated.phone,
    weight: updated.adminNotes || updated.product.weight,
    price: updated.totalAmount,
    status: 'PAID',
    city: updated.city || '',
  }).catch(console.error);

  // Generate Invoice PDF and send to Admin via Telegram
  try {
    const pdfBuffer = generateOrderInvoicePDF({
      ...updated,
      transactionId: data.razorpayPaymentId,
    });
    sendTelegramDocument(
      pdfBuffer,
      `Invoice-${updated.id.slice(-8).toUpperCase()}.pdf`,
      `🧾 <b>Invoice & Order Receipt #${updated.id.slice(-8).toUpperCase()}</b>\n👤 Customer: ${updated.customerName}\n📱 Phone: ${updated.phone}\n💰 Amount: ₹${updated.totalAmount}\n✅ Status: PAID / CONFIRMED`
    ).catch(console.error);
  } catch (pdfErr) {
    console.error('Invoice PDF generation or Telegram send failed (non-fatal):', pdfErr);
  }

  updateOrderInSheet(data.orderId, 'PAID', {
    customerName: updated.customerName,
    phone: updated.phone,
    weight: updated.adminNotes || updated.product.weight,
    amount: updated.totalAmount,
    city: updated.city || '',
    createdAt: updated.createdAt,
  }).catch(console.error);

  return {
    id: updated.id,
    status: updated.status,
    paymentId: data.razorpayPaymentId,
  };
}

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
    weight: updated.adminNotes || updated.product.weight,
    price: updated.totalAmount,
    status: 'PAYMENT_REVIEW',
    city: updated.city || '',
  }).catch(console.error);

  // Generate Receipt PDF and send to Admin via Telegram
  try {
    const pdfBuffer = generateOrderInvoicePDF(updated);
    sendTelegramDocument(
      pdfBuffer,
      `Invoice-${updated.id.slice(-8).toUpperCase()}.pdf`,
      `🧾 <b>Invoice & Order Receipt #${updated.id.slice(-8).toUpperCase()}</b>\n👤 Customer: ${updated.customerName}\n📱 Phone: ${updated.phone}\n💰 Amount: ₹${updated.totalAmount}\n🔍 Status: PAYMENT REVIEW`
    ).catch(console.error);
  } catch (pdfErr) {
    console.error('Invoice PDF generation or Telegram send failed (non-fatal):', pdfErr);
  }

  updateOrderInSheet(orderId, 'PAYMENT_REVIEW', {
    customerName: updated.customerName,
    phone: updated.phone,
    weight: updated.adminNotes || updated.product.weight,
    amount: updated.totalAmount,
    city: updated.city || '',
    createdAt: updated.createdAt,
  }).catch(console.error);

  return { id: updated.id, status: updated.status };
}
