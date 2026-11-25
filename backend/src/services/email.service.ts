import nodemailer, { Transporter } from 'nodemailer';
import { getConfig } from '../config';

let transporter: Transporter | null = null;

async function sendViaResend(options: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{ filename: string; content: Buffer }>;
}): Promise<boolean> {
  const config = getConfig();
  if (!config.RESEND_API_KEY) return false;

  try {
    const from = `"Appampattu Mutta Mittai" <${config.RESEND_FROM_EMAIL || 'orders@appampattueggsweet.com'}>`;
    const toArray = Array.isArray(options.to) ? options.to : [options.to];

    const body: Record<string, unknown> = {
      from,
      to: toArray,
      subject: options.subject,
      html: options.html,
    };
    if (options.text) body.text = options.text;
    if (options.attachments && options.attachments.length > 0) {
      body.attachments = options.attachments.map((att) => ({
        filename: att.filename,
        content: att.content.toString('base64'),
      }));
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[Resend API] ❌ Failed to send email (HTTP ${res.status}):`, errText);
      return false;
    }

    const data = (await res.json()) as { id?: string };
    console.log(`[Resend API] ✅ Email delivered via Resend (ID: ${data.id}) to ${options.to}`);
    return true;
  } catch (err: unknown) {
    console.error('[Resend API] ❌ Network error calling Resend API:', (err as Error).message);
    return false;
  }
}

function getMailTransporter(): Transporter | null {
  const config = getConfig();

  if (config.RESEND_API_KEY) {
    if (!transporter) {
      transporter = nodemailer.createTransport({
        host: 'smtp.resend.com',
        port: 465,
        secure: true,
        auth: {
          user: 'resend',
          pass: config.RESEND_API_KEY,
        },
      });
    }
    return transporter;
  }

  if (!config.GMAIL_APP_PASSWORD) {
    return null;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.SMTP_HOST || 'smtp.gmail.com',
      port: config.SMTP_PORT || 465,
      secure: (config.SMTP_PORT || 465) === 465, // true for 465, false for 587
      auth: {
        user: config.SMTP_USER || config.ADMIN_NOTIFICATION_EMAIL,
        pass: config.GMAIL_APP_PASSWORD,
      },
      connectionTimeout: 10000,
      greetingTimeout: 5000,
      socketTimeout: 10000,
    });
  }

  return transporter;
}

export async function sendAdminEmail(options: {
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{ filename: string; content: Buffer }>;
}): Promise<boolean> {
  const config = getConfig();

  // 1. Prioritize Resend API (0% spam, verified domain delivery)
  if (config.RESEND_API_KEY) {
    const sent = await sendViaResend({
      to: config.ADMIN_NOTIFICATION_EMAIL,
      subject: options.subject,
      html: options.html,
      text: options.text,
      attachments: options.attachments,
    });
    if (sent) return true;
  }

  // 2. Fallback to SMTP
  const transport = getMailTransporter();
  if (!transport) {
    console.log('[Email] Admin notification skipped: Neither RESEND_API_KEY nor GMAIL_APP_PASSWORD is set.');
    return false;
  }

  try {
    await transport.sendMail({
      from: `"Appampattu Mutta Mittai" <${config.SMTP_USER || config.ADMIN_NOTIFICATION_EMAIL}>`,
      to: config.ADMIN_NOTIFICATION_EMAIL,
      subject: options.subject,
      html: options.html,
      text: options.text,
      attachments: options.attachments,
    });
    console.log(`[Email] ✅ Admin notification successfully sent to ${config.ADMIN_NOTIFICATION_EMAIL}: "${options.subject}"`);
    return true;
  } catch (err: unknown) {
    console.error('[Email] Failed to send email notification (non-fatal):', (err as Error).message);
    return false;
  }
}

// 🔐 CUSTOMER OTP EMAIL (Dynamic 6-digit random code valid for 10 minutes)
export async function sendCustomerOtpEmail(options: {
  email: string;
  customerName?: string;
  code: string;
}): Promise<boolean> {
  const config = getConfig();

  const nameGreeting = options.customerName ? `Hello ${options.customerName},` : 'Hello,';
  const text = `${nameGreeting}\n\nYour verification code for Appampattu Mutta Mittai is: ${options.code}\n\nThis code is valid for 10 minutes. Please do not share this code with anyone.\n\nAppampattu Mutta Mittai\nVillupuram Railway Station, 1st Platform, Villupuram, Tamil Nadu - 605602`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #FFFBF6; border: 1.5px solid #E5D5C5; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 16px rgba(88,42,0,0.08);">
      <div style="background: #582A00; padding: 22px; text-align: center; color: #FFFFFF;">
        <h2 style="margin: 0; font-size: 20px; letter-spacing: 0.5px;">Appampattu Mutta Mittai</h2>
        <p style="margin: 6px 0 0 0; font-size: 13px; color: #F5B51B;">Order Verification Code</p>
      </div>
      <div style="padding: 28px 24px; text-align: center;">
        <p style="font-size: 15px; color: #3A1C10; margin-top: 0; text-align: left;">
          ${nameGreeting}
        </p>
        <p style="font-size: 14px; color: #582A00; text-align: left; line-height: 1.5;">
          Use the 6-digit verification code below to verify your order:
        </p>
        <div style="margin: 24px auto; padding: 16px 28px; background: #FFFFFF; border: 2px dashed #C42F2C; border-radius: 12px; display: inline-block;">
          <span style="font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #C42F2C; font-family: monospace;">
            ${options.code}
          </span>
        </div>
        <p style="font-size: 13px; color: #7A5C43; margin-bottom: 0;">
          ⏰ Valid for <strong>10 minutes</strong>. Do not share this code with anyone.
        </p>
      </div>
      <div style="background: #F3EAE1; padding: 14px; text-align: center; font-size: 11px; color: #8A684C; line-height: 1.4;">
        Appampattu Mutta Mittai • Villupuram Railway Station, 1st Platform, Villupuram, Tamil Nadu - 605602<br/>
        For support, WhatsApp: +91 78719 49015
      </div>
    </div>
  `;

  // 1. Send via Resend API (0% spam, authenticated domain)
  if (config.RESEND_API_KEY) {
    const resendSuccess = await sendViaResend({
      to: options.email,
      subject: `Appampattu Mutta Mittai: ${options.code} is your verification code`,
      html,
      text,
    });
    if (resendSuccess) return true;
  }

  // 2. Fallback to Gmail SMTP if configured
  const transport = getMailTransporter();
  if (transport) {
    try {
      await transport.sendMail({
        from: `"Appampattu Mutta Mittai" <${config.SMTP_USER || config.ADMIN_NOTIFICATION_EMAIL}>`,
        to: options.email,
        subject: `Appampattu Mutta Mittai: ${options.code} is your verification code`,
        html,
        text,
      });
      console.log(`[Email] ✅ Customer OTP code sent via SMTP to ${options.email}`);
      return true;
    } catch (err: unknown) {
      console.error(`[Email] Failed to send OTP to ${options.email}:`, (err as Error).message);
    }
  }

  console.log(`[Email] Transport not configured or failed. Generated OTP for ${options.email}: ${options.code}`);
  return false;
}

// 🔔 NOTIFICATION 1: Customer entered Name & Mobile Number on Order Page
export async function notifyLeadEmail(lead: {
  customerName: string;
  phone: string;
  email?: string;
}): Promise<void> {
  const time = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const cleanPhone = lead.phone.replace(/\D/g, '');
  const waUrl = `https://wa.me/91${cleanPhone}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #FFFBF6; border: 1px solid #E5D5C5; border-radius: 12px; overflow: hidden;">
      <div style="background: #582A00; padding: 20px; text-align: center; color: #FFFFFF;">
        <h2 style="margin: 0; font-size: 20px; letter-spacing: 0.5px;">Appampattu Mutta Mittai</h2>
        <p style="margin: 5px 0 0 0; font-size: 13px; color: #F5B51B;">🛒 Customer Active on Order Page</p>
      </div>
      <div style="padding: 24px;">
        <p style="font-size: 15px; color: #3A1C10; margin-top: 0;">
          A customer is currently checking out on the order page:
        </p>
        <div style="background: #FFFFFF; border: 1.5px solid #F0E3D5; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #3A1C10;">
            <tr>
              <td style="padding: 6px 0; font-weight: bold; width: 140px;">👤 Customer Name:</td>
              <td style="padding: 6px 0;">${lead.customerName || 'Pending'}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold;">📱 Mobile Number:</td>
              <td style="padding: 6px 0;">
                <a href="tel:+91${cleanPhone}" style="color: #582A00; font-weight: bold; text-decoration: none;">+91 ${cleanPhone}</a>
              </td>
            </tr>
            ${
              lead.email
                ? `<tr>
              <td style="padding: 6px 0; font-weight: bold;">📧 Email:</td>
              <td style="padding: 6px 0;">
                <a href="mailto:${lead.email}" style="color: #582A00; font-weight: bold; text-decoration: none;">${lead.email}</a>
              </td>
            </tr>`
                : ''
            }
            <tr>
              <td style="padding: 6px 0; font-weight: bold;">⏰ Time:</td>
              <td style="padding: 6px 0; color: #666;">${time}</td>
            </tr>
          </table>
        </div>
        <div style="text-align: center; margin-top: 20px;">
          <a href="${waUrl}" style="display: inline-block; background: #25D366; color: #FFFFFF; font-weight: bold; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-size: 13px;">
            💬 Open Customer in WhatsApp
          </a>
        </div>
      </div>
      <div style="background: #F3EAE1; padding: 12px; text-align: center; font-size: 11px; color: #7A5C43;">
        Automated background lead alert from Appampattu Mutta Mittai
      </div>
    </div>
  `;

  // Asynchronous non-blocking dispatch
  setImmediate(() => {
    sendAdminEmail({
      subject: `🛒 Customer on Order Page: ${lead.customerName || 'Customer'} (+91 ${cleanPhone})`,
      html,
    });
  });
}

// 🔔 NOTIFICATION 2: Order Placed (Payment Pending)
export async function notifyOrderPendingEmail(order: {
  id: string;
  customerName: string;
  phone: string;
  weight: string;
  price: number;
  streetAddress?: string | null;
  city?: string | null;
  deliveryMethod?: string | null;
}): Promise<void> {
  const time = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const cleanPhone = order.phone.replace(/\D/g, '');
  const orderIdShort = order.id.slice(-8).toUpperCase();

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #FFFBF6; border: 1px solid #E5D5C5; border-radius: 12px; overflow: hidden;">
      <div style="background: #F5B51B; padding: 20px; text-align: center; color: #582A00;">
        <h2 style="margin: 0; font-size: 20px;">Appampattu Mutta Mittai</h2>
        <p style="margin: 5px 0 0 0; font-size: 14px; font-weight: bold;">⏳ New Order Initiated (#${orderIdShort})</p>
      </div>
      <div style="padding: 24px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #3A1C10;">
          <tr><td style="padding: 6px 0; font-weight: bold; width: 140px;">🆔 Order ID:</td><td style="padding: 6px 0; font-family: monospace; font-weight: bold;">#${orderIdShort}</td></tr>
          <tr><td style="padding: 6px 0; font-weight: bold;">👤 Customer:</td><td style="padding: 6px 0;">${order.customerName}</td></tr>
          <tr><td style="padding: 6px 0; font-weight: bold;">📱 Phone:</td><td style="padding: 6px 0;"><a href="tel:+91${cleanPhone}" style="color: #582A00; font-weight: bold;">+91 ${cleanPhone}</a></td></tr>
          <tr><td style="padding: 6px 0; font-weight: bold;">📦 Pack Size:</td><td style="padding: 6px 0;">${order.weight}</td></tr>
          <tr><td style="padding: 6px 0; font-weight: bold;">💰 Total Amount:</td><td style="padding: 6px 0; font-size: 16px; font-weight: bold; color: #063D20;">₹${order.price}</td></tr>
          <tr><td style="padding: 6px 0; font-weight: bold;">🚚 Delivery:</td><td style="padding: 6px 0;">${order.deliveryMethod}</td></tr>
          <tr><td style="padding: 6px 0; font-weight: bold;">📍 Address:</td><td style="padding: 6px 0;">${order.streetAddress}, ${order.city}</td></tr>
          <tr><td style="padding: 6px 0; font-weight: bold;">⏰ Time:</td><td style="padding: 6px 0; color: #666;">${time}</td></tr>
          <tr><td style="padding: 6px 0; font-weight: bold;">📊 Status:</td><td style="padding: 6px 0; color: #B45309; font-weight: bold;">PAYMENT_PENDING (Waiting for payment)</td></tr>
        </table>
      </div>
    </div>
  `;

  setImmediate(() => {
    sendAdminEmail({
      subject: `⏳ New Order Initiated #${orderIdShort} — ${order.customerName} (₹${order.price})`,
      html,
    });
  });
}

// ✅ NOTIFICATION 3: Order Paid & Confirmed
export async function notifyOrderPaidEmail(
  order: {
    id: string;
    customerName: string;
    phone: string;
    weight: string;
    price: number;
    status: string;
    city?: string | null;
    streetAddress?: string | null;
    deliveryMethod?: string | null;
    transactionId?: string | null;
  },
  pdfAttachment?: { filename: string; buffer: Buffer }
): Promise<void> {
  const time = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const cleanPhone = order.phone.replace(/\D/g, '');
  const orderIdShort = order.id.slice(-8).toUpperCase();

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #FFFBF6; border: 1px solid #E5D5C5; border-radius: 12px; overflow: hidden;">
      <div style="background: #063D20; padding: 20px; text-align: center; color: #FFFFFF;">
        <h2 style="margin: 0; font-size: 20px;">Appampattu Mutta Mittai</h2>
        <p style="margin: 5px 0 0 0; font-size: 15px; font-weight: bold; color: #4ADE80;">✅ Order PAID & Confirmed (#${orderIdShort})</p>
      </div>
      <div style="padding: 24px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #3A1C10;">
          <tr><td style="padding: 6px 0; font-weight: bold; width: 140px;">🆔 Order ID:</td><td style="padding: 6px 0; font-family: monospace; font-weight: bold;">#${orderIdShort}</td></tr>
          <tr><td style="padding: 6px 0; font-weight: bold;">👤 Customer:</td><td style="padding: 6px 0;">${order.customerName}</td></tr>
          <tr><td style="padding: 6px 0; font-weight: bold;">📱 Phone:</td><td style="padding: 6px 0;"><a href="tel:+91${cleanPhone}" style="color: #063D20; font-weight: bold;">+91 ${cleanPhone}</a></td></tr>
          <tr><td style="padding: 6px 0; font-weight: bold;">📦 Pack Size:</td><td style="padding: 6px 0;">${order.weight}</td></tr>
          <tr><td style="padding: 6px 0; font-weight: bold;">💰 Amount Paid:</td><td style="padding: 6px 0; font-size: 16px; font-weight: bold; color: #063D20;">₹${order.price}</td></tr>
          ${order.deliveryMethod ? `<tr><td style="padding: 6px 0; font-weight: bold;">🚚 Delivery:</td><td style="padding: 6px 0;">${order.deliveryMethod}</td></tr>` : ''}
          ${order.streetAddress ? `<tr><td style="padding: 6px 0; font-weight: bold;">📍 Address:</td><td style="padding: 6px 0;">${order.streetAddress}, ${order.city}</td></tr>` : ''}
          ${order.transactionId ? `<tr><td style="padding: 6px 0; font-weight: bold;">💳 Transaction ID:</td><td style="padding: 6px 0; font-family: monospace;">${order.transactionId}</td></tr>` : ''}
          <tr><td style="padding: 6px 0; font-weight: bold;">⏰ Time:</td><td style="padding: 6px 0; color: #666;">${time}</td></tr>
          <tr><td style="padding: 6px 0; font-weight: bold;">📊 Status:</td><td style="padding: 6px 0; color: #16A34A; font-weight: bold;">PAID ✅</td></tr>
        </table>
        <div style="text-align: center; margin-top: 20px;">
          <a href="https://wa.me/91${cleanPhone}?text=Hello%20${encodeURIComponent(order.customerName)}%2C%20thank%20you%20for%20your%20order%20%23${orderIdShort}%20with%20Appampattu%20Mutta%20Mittai%21" style="display: inline-block; background: #25D366; color: #FFFFFF; font-weight: bold; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-size: 13px;">
            💬 Message Customer on WhatsApp
          </a>
        </div>
      </div>
    </div>
  `;

  setImmediate(() => {
    sendAdminEmail({
      subject: `✅ Order PAID #${orderIdShort} — ${order.customerName} (₹${order.price})`,
      html,
      attachments: pdfAttachment ? [{ filename: pdfAttachment.filename, content: pdfAttachment.buffer }] : undefined,
    });
  });
}
