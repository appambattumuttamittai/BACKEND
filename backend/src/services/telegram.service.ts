import axios from 'axios';
import { getConfig } from '../config';

function maskPhone(phone: string): string {
  if (phone.length <= 6) return '******';
  return phone.slice(0, 2) + '****' + phone.slice(-4);
}

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
    // Telegram failure should never crash the app
    console.error('Telegram notification failed (non-fatal):', (err as Error).message);
  }
}

export async function notifyOrder(order: {
  id: string;
  customerName: string;
  phone: string;
  weight: string;
  price: number;
  status: string;
  city?: string;
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

  const message = `
${emoji} <b>Mutta Mittai – Order Update</b>

📦 <b>Order ID:</b> <code>${order.id.slice(-8).toUpperCase()}</code>
👤 <b>Customer:</b> ${order.customerName}
📱 <b>Phone:</b> ${maskPhone(order.phone)}
⚖️ <b>Weight:</b> ${order.weight}
💰 <b>Amount:</b> ₹${order.price}
📊 <b>Status:</b> <b>${order.status}</b>
${order.city ? `📍 <b>City:</b> ${order.city}` : ''}
⏰ <b>Time:</b> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
  `.trim();

  await sendTelegramMessage(message);
}
