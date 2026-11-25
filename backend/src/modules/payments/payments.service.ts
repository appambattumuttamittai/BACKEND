import crypto from 'crypto';
import axios from 'axios';
import { PrismaClient, OrderStatus } from '@prisma/client';
import { notifyOrder, sendTelegramDocument } from '../../services/telegram.service';
import { notifyOrderPaidEmail } from '../../services/email.service';
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

export async function confirmOrderPaid(
  prisma: PrismaClient,
  orderId: string,
  razorpayPaymentId: string
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { product: true },
  });

  if (!order) throw new Error('ORDER_NOT_FOUND');

  // Idempotency: If order is already PAID, return without duplicating notifications
  if (order.status === OrderStatus.PAID) {
    return {
      id: order.id,
      status: order.status,
      paymentId: razorpayPaymentId,
    };
  }

  const notesAppend = `Razorpay: ${razorpayPaymentId}`;
  const updated = await prisma.order.update({
    where: { id: orderId },
    data: {
      status: OrderStatus.PAID,
      paidAt: new Date(),
      adminNotes: order.adminNotes ? `${order.adminNotes} | ${notesAppend}` : notesAppend,
    },
    include: { product: true },
  });

  // Async notifications
  const isPickupPaid =
    Boolean(updated.streetAddress?.toLowerCase().includes('pick up') ||
    updated.streetAddress?.toLowerCase().includes('store') ||
    updated.city?.toLowerCase().includes('pickup') ||
    updated.adminNotes?.includes('[STORE PICKUP]'));

  const deliveryTextPaid = isPickupPaid
    ? '🏬 Store Pickup (Villupuram Railway Station)'
    : '🚚 Home Delivery (Within Villupuram City)';

  notifyOrder({
    id: updated.id,
    customerName: updated.customerName,
    phone: updated.phone,
    weight: updated.adminNotes || updated.product.weight,
    price: updated.totalAmount,
    status: 'PAID',
    city: updated.city || '',
    streetAddress: updated.streetAddress || '',
    deliveryMethod: deliveryTextPaid,
    transactionId: razorpayPaymentId,
  }).catch(console.error);

  // Generate Invoice PDF and send to Admin via Telegram
  try {
    const isPickup =
      Boolean(updated.streetAddress?.toLowerCase().includes('pick up') ||
      updated.streetAddress?.toLowerCase().includes('store') ||
      updated.city?.toLowerCase().includes('pickup') ||
      updated.adminNotes?.includes('[STORE PICKUP]'));

    const deliveryMethodText = isPickup
      ? '🏬 Pick Up in Store (Villupuram Railway Station)'
      : '🚚 HOME DELIVERY (Within Villupuram City)';

    const pdfBuffer = generateOrderInvoicePDF({
      ...updated,
      transactionId: razorpayPaymentId,
    });
    sendTelegramDocument(
      pdfBuffer,
      `Invoice-${updated.id.slice(-8).toUpperCase()}.pdf`,
      `🧾 <b>Official Tax Invoice & Receipt #${updated.id.slice(-8).toUpperCase()}</b>\n👤 Customer: ${updated.customerName}\n📱 Phone: ${updated.phone}\n💰 Amount: ₹${updated.totalAmount}\n📍 Delivery: ${deliveryMethodText}\n✅ Status: PAID / CONFIRMED`
    ).catch(console.error);

    notifyOrderPaidEmail(
      {
        ...updated,
        price: updated.totalAmount,
        weight: updated.adminNotes || updated.product.weight,
        transactionId: razorpayPaymentId,
      },
      {
        filename: `Invoice-${updated.id.slice(-8).toUpperCase()}.pdf`,
        buffer: pdfBuffer,
      }
    ).catch(console.error);
  } catch (pdfErr) {
    console.error('Invoice PDF generation or Telegram send failed (non-fatal):', pdfErr);
  }

  updateOrderInSheet(orderId, 'PAID', {
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
    paymentId: razorpayPaymentId,
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

  return confirmOrderPaid(prisma, data.orderId, data.razorpayPaymentId);
}

export async function handleRazorpayWebhook(
  prisma: PrismaClient,
  rawBody: string,
  signature: string | undefined,
  eventData: any
) {
  const config = getConfig();
  const secret = config.RAZORPAY_WEBHOOK_SECRET || config.RAZORPAY_KEY_SECRET;

  if (secret) {
    if (!signature) {
      console.error('[Razorpay Webhook] Missing signature header');
      throw new Error('INVALID_WEBHOOK_SIGNATURE');
    }
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    if (expectedSignature !== signature) {
      console.error('[Razorpay Webhook] Invalid signature verification');
      throw new Error('INVALID_WEBHOOK_SIGNATURE');
    }
  }

  const event = eventData?.event;
  console.log(`[Razorpay Webhook] Event received: ${event}`);

  if (event === 'order.paid' || event === 'payment.captured') {
    const payload = eventData?.payload;
    const orderEntity = payload?.order?.entity;
    const paymentEntity = payload?.payment?.entity;

    const orderNotes = orderEntity?.notes || {};
    const paymentNotes = paymentEntity?.notes || {};

    let orderId = orderNotes.orderId || paymentNotes.orderId;

    if (!orderId && orderEntity?.receipt) {
      const receipt = String(orderEntity.receipt);
      const match = await prisma.order.findFirst({
        where: { id: { endsWith: receipt.replace('rcpt_', '') } },
      });
      if (match) orderId = match.id;
    }

    const paymentId = paymentEntity?.id || `pay_wh_${Date.now()}`;

    if (orderId) {
      console.log(`[Razorpay Webhook] Auto-confirming order #${orderId} (Payment: ${paymentId})`);
      await confirmOrderPaid(prisma, orderId, paymentId);
      return { success: true, orderId, paymentId };
    } else {
      console.warn('[Razorpay Webhook] Could not find orderId in webhook event notes:', orderNotes, paymentNotes);
    }
  }

  return { success: true, message: `Event ${event} processed` };
}
