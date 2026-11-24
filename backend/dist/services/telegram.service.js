"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendTelegramMessage = sendTelegramMessage;
exports.notifyOrderPending = notifyOrderPending;
exports.notifyOrder = notifyOrder;
exports.sendTelegramDocument = sendTelegramDocument;
const axios_1 = __importDefault(require("axios"));
const config_1 = require("../config");
async function sendTelegramMessage(message) {
    const config = (0, config_1.getConfig)();
    try {
        await axios_1.default.post(`https://api.telegram.org/bot${config.TELEGRAM_BOT_TOKEN}/sendMessage`, {
            chat_id: config.TELEGRAM_CHAT_ID,
            text: message,
            parse_mode: 'HTML',
        }, { timeout: 5000 });
    }
    catch (err) {
        console.error('Telegram notification failed (non-fatal):', err.message);
    }
}
// 🔔 NOTIFICATION 1 — Sent when order is created, before Razorpay payment
async function notifyOrderPending(order) {
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
}
// ✅ NOTIFICATION 2 — Sent after Razorpay payment is confirmed
async function notifyOrder(order) {
    const statusEmoji = {
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
}
async function sendTelegramDocument(fileBuffer, filename, caption) {
    const config = (0, config_1.getConfig)();
    if (!config.TELEGRAM_BOT_TOKEN || !config.TELEGRAM_CHAT_ID)
        return;
    try {
        const formData = new FormData();
        formData.append('chat_id', config.TELEGRAM_CHAT_ID);
        if (caption) {
            formData.append('caption', caption);
            formData.append('parse_mode', 'HTML');
        }
        const blob = new Blob([fileBuffer], { type: 'application/pdf' });
        formData.append('document', blob, filename);
        await axios_1.default.post(`https://api.telegram.org/bot${config.TELEGRAM_BOT_TOKEN}/sendDocument`, formData, { timeout: 15000 });
    }
    catch (err) {
        console.error('Telegram sendDocument failed (non-fatal):', err.message);
    }
}
//# sourceMappingURL=telegram.service.js.map