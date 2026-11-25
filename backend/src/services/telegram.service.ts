import axios from 'axios';
import { getConfig } from '../config';
import { notifyOrderPendingEmail, notifyOrderPaidEmail } from './email.service';

const recentLeadAlerts = new Map<string, number>();

export async function sendTelegramMessage(message: string): Promise<void> {
  const config = getConfig();
  try {
    await axios.post(
      `https://api.telegram.org/bot${config.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        chat_id: config.TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'HTML',
      },
      { timeout: 5000 }
    );
  } catch (err) {
    console.error('Telegram notification failed (non-fatal):', (err as Error).message);
  }
}

/**
 * Deduplicated lead alert to prevent spamming identical Telegram notifications
 * Cooldown: 30 minutes per customer phone number
 */
export async function notifyLeadTelegram(phone: string, message: string): Promise<void> {
  const clean = phone.replace(/\D/g, '');
  const now = Date.now();
  const lastSent = recentLeadAlerts.get(clean);

  if (lastSent && now - lastSent < 30 * 60 * 1000) {
    console.log(`[Telegram] Suppressing duplicate lead alert for ${clean} (30m cooldown active)`);
    return;
  }

  recentLeadAlerts.set(clean, now);
  await sendTelegramMessage(message);
}

// 🔔 NOTIFICATION 1 — Sent when order is created, before Razorpay payment
export async function notifyOrderPending(order: {
  id: string;
  customerName: string;
  phone: string;
  weight: string;
  price: number;
  streetAddress: string;
  city: string;
  deliveryMethod: string;
}): Promise<void> {
  const time = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const message = `
🛒 <b>New Customer on Order Page!</b>

👤 <b>Name:</b> ${order.customerName}
📱 <b>Phone:</b> <code>${order.phone}</code>
📦 <b>Order:</b> ${order.weight}
💰 <b>Amount:</b> ₹${order.price}
🚚 <b>Delivery:</b> ${order.deliveryMethod}
📍 <b>Address:</b> ${order.streetAddress}
🏙️ <b>City:</b> ${order.city}
🆔 <b>Order ID:</b> <code>${order.id.slice(-8).toUpperCase()}</code>
⏰ <b>Time:</b> ${time}

⏳ <i>Waiting for payment...</i>
  `.trim();

  await sendTelegramMessage(message);

  // Simultaneous background email to admin Gmail
  notifyOrderPendingEmail(order).catch((err) => {
    console.error('Order pending email failed (non-fatal):', (err as Error).message);
  });
}

// ✅ NOTIFICATION 2 — Sent after Razorpay payment is confirmed
export async function notifyOrder(order: {
  id: string;
  customerName: string;
  phone: string;
  weight: string;
  price: number;
  status: string;
  city: string;
  streetAddress?: string;
  deliveryMethod?: string;
  transactionId?: string;
}): Promise<void> {
  const statusEmoji: Record<string, string> = {
    PAYMENT_PENDING: '⏳',
    PAYMENT_REVIEW: '🔍',
    PAID: '✅',
    PAYMENT_FAILED: '❌',
    READY_FOR_PICKUP: '📦',
    PICKED_UP: '🎉',
    CANCELLED: '🚫',
  };

  const emoji = statusEmoji[order.status] || '📋';
  const time = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  const message = `
${emoji} <b>Mutta Mittai — Order ${order.status === 'PAID' ? 'PAID ✅' : 'Update'}</b>

🆔 <b>Order ID:</b> <code>${order.id.slice(-8).toUpperCase()}</code>
👤 <b>Customer:</b> ${order.customerName}
📱 <b>Phone:</b> <code>${order.phone}</code>
📦 <b>Items:</b> ${order.weight}
💰 <b>Amount:</b> ₹${order.price}
📊 <b>Status:</b> <b>${order.status}</b>
${order.deliveryMethod ? `🚚 <b>Delivery:</b> ${order.deliveryMethod}` : ''}
${order.streetAddress ? `📍 <b>Address:</b> ${order.streetAddress}` : ''}
🏙️ <b>City:</b> ${order.city}
${order.transactionId ? `💳 <b>Transaction ID:</b> <code>${order.transactionId}</code>` : ''}
⏰ <b>Time:</b> ${time}
  `.trim();

  await sendTelegramMessage(message);

  // Simultaneous background email to admin Gmail
  notifyOrderPaidEmail(order).catch((err) => {
    console.error('Order email notification failed (non-fatal):', (err as Error).message);
  });
}

export async function sendTelegramDocument(
  fileBuffer: Buffer,
  filename: string,
  caption?: string
): Promise<void> {
  const config = getConfig();
  if (!config.TELEGRAM_BOT_TOKEN || !config.TELEGRAM_CHAT_ID) return;

  try {
    const formData = new FormData();
    formData.append('chat_id', config.TELEGRAM_CHAT_ID);
    if (caption) {
      formData.append('caption', caption);
      formData.append('parse_mode', 'HTML');
    }
    const blob = new Blob([fileBuffer], { type: 'application/pdf' });
    formData.append('document', blob, filename);

    await axios.post(
      `https://api.telegram.org/bot${config.TELEGRAM_BOT_TOKEN}/sendDocument`,
      formData,
      { timeout: 15000 }
    );
  } catch (err) {
    console.error('Telegram sendDocument failed (non-fatal):', (err as Error).message);
  }
}
