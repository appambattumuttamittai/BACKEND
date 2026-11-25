import axios from 'axios';
import { getConfig } from '../config';
import { notifyOrderPendingEmail, notifyOrderPaidEmail } from './email.service';

const recentLeadAlerts = new Map<string, number>();

export function escapeHtml(str: string | number | null | undefined): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function stripHtml(str: string): string {
  return str.replace(/<[^>]*>?/gm, '');
}

export async function sendTelegramMessage(message: string): Promise<void> {
  const config = getConfig();
  if (!config.TELEGRAM_BOT_TOKEN || !config.TELEGRAM_CHAT_ID) {
    console.warn('[Telegram] BOT_TOKEN or CHAT_ID missing. Skipping message.');
    return;
  }

  try {
    await axios.post(
      `https://api.telegram.org/bot${config.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        chat_id: config.TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'HTML',
      },
      { timeout: 15000 }
    );
  } catch (err: any) {
    console.error('Telegram HTML notification failed:', err?.response?.data || err?.message);
    // Fallback: retry as plain text without HTML formatting if Telegram rejected tags or special chars
    try {
      const plain = stripHtml(message);
      await axios.post(
        `https://api.telegram.org/bot${config.TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          chat_id: config.TELEGRAM_CHAT_ID,
          text: plain,
        },
        { timeout: 15000 }
      );
      console.log('[Telegram] Successfully sent notification in plain text fallback mode.');
    } catch (retryErr: any) {
      console.error('Telegram plain text retry also failed:', retryErr?.response?.data || retryErr?.message);
    }
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

👤 <b>Name:</b> ${escapeHtml(order.customerName)}
📱 <b>Phone:</b> <code>${escapeHtml(order.phone)}</code>
📦 <b>Order:</b> ${escapeHtml(order.weight)}
💰 <b>Amount:</b> ₹${order.price}
🚚 <b>Delivery:</b> ${escapeHtml(order.deliveryMethod)}
📍 <b>Address:</b> ${escapeHtml(order.streetAddress)}
🏙️ <b>City:</b> ${escapeHtml(order.city)}
🆔 <b>Order ID:</b> <code>${escapeHtml(order.id.slice(-8).toUpperCase())}</code>
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

🆔 <b>Order ID:</b> <code>${escapeHtml(order.id.slice(-8).toUpperCase())}</code>
👤 <b>Customer:</b> ${escapeHtml(order.customerName)}
📱 <b>Phone:</b> <code>${escapeHtml(order.phone)}</code>
📦 <b>Items:</b> ${escapeHtml(order.weight)}
💰 <b>Amount:</b> ₹${order.price}
📊 <b>Status:</b> <b>${escapeHtml(order.status)}</b>
${order.deliveryMethod ? `🚚 <b>Delivery:</b> ${escapeHtml(order.deliveryMethod)}` : ''}
${order.streetAddress ? `📍 <b>Address:</b> ${escapeHtml(order.streetAddress)}` : ''}
🏙️ <b>City:</b> ${escapeHtml(order.city)}
${order.transactionId ? `💳 <b>Transaction ID:</b> <code>${escapeHtml(order.transactionId)}</code>` : ''}
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
      { timeout: 20000 }
    );
  } catch (err: any) {
    console.error('Telegram sendDocument failed:', err?.response?.data || err?.message);
    // If failed due to caption HTML error, retry with plain text caption
    if (caption) {
      try {
        const formData = new FormData();
        formData.append('chat_id', config.TELEGRAM_CHAT_ID);
        formData.append('caption', stripHtml(caption));
        const blob = new Blob([fileBuffer], { type: 'application/pdf' });
        formData.append('document', blob, filename);

        await axios.post(
          `https://api.telegram.org/bot${config.TELEGRAM_BOT_TOKEN}/sendDocument`,
          formData,
          { timeout: 20000 }
        );
        console.log('[Telegram] Successfully sent document with plain text caption fallback.');
      } catch (retryErr: any) {
        console.error('Telegram sendDocument plain text retry also failed:', retryErr?.response?.data || retryErr?.message);
      }
    }
  }
}
