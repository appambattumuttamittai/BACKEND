"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendTelegramMessage = sendTelegramMessage;
exports.notifyOrder = notifyOrder;
const axios_1 = __importDefault(require("axios"));
const config_1 = require("../config");
function maskPhone(phone) {
    if (phone.length <= 6)
        return '******';
    return phone.slice(0, 2) + '****' + phone.slice(-4);
}
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
        // Telegram failure should never crash the app
        console.error('Telegram notification failed (non-fatal):', err.message);
    }
}
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
//# sourceMappingURL=telegram.service.js.map