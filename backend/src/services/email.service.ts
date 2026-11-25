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

// 🔐 CUSTOMER OTP EMAIL (Enterprise Black & White Professional Theme)
export async function sendCustomerOtpEmail(options: {
  email: string;
  customerName?: string;
  code: string;
}): Promise<boolean> {
  const config = getConfig();

  const nameGreeting = options.customerName ? `Hello ${options.customerName},` : 'Hello,';
  const text = `${nameGreeting}\n\nYour verification code for Appampattu Mutta Mittai is: ${options.code}\n\nAccount Email: ${options.email}\nValid for 10 minutes. Please do not share this code with anyone.\n\nAppampattu Mutta Mittai\nVillupuram Railway Station, 1st Platform, Villupuram, Tamil Nadu - 605602`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #F3F4F6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F3F4F6; padding: 32px 12px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" style="max-width: 520px; background-color: #FFFFFF; border-radius: 12px; border: 1px solid #E5E7EB; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06); overflow: hidden;" cellspacing="0" cellpadding="0">
              <!-- Dark Black Enterprise Header -->
              <tr>
                <td style="background-color: #000000; padding: 26px 28px; text-align: left; border-bottom: 1px solid #1F2937;">
                  <div style="font-size: 11px; font-weight: 700; color: #9CA3AF; text-transform: uppercase; letter-spacing: 2px;">
                    Order Verification
                  </div>
                  <h1 style="margin: 6px 0 0 0; font-size: 20px; font-weight: 800; color: #FFFFFF; letter-spacing: 0.3px;">
                    Appampattu Mutta Mittai
                  </h1>
                </td>
              </tr>

              <!-- White Content Area with Crisp Dark Black Text -->
              <tr>
                <td style="padding: 32px 28px; background-color: #FFFFFF;">
                  <p style="margin: 0 0 16px 0; font-size: 15px; color: #111827; font-weight: 600;">
                    ${nameGreeting}
                  </p>
                  <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #374151;">
                    Please use the 6-digit verification code below to verify your contact information and confirm your order.
                  </p>

                  <!-- High-Contrast Enterprise OTP Box -->
                  <div style="background-color: #F9FAFB; border: 1.5px solid #E5E7EB; border-radius: 10px; padding: 24px 20px; text-align: center; margin: 24px 0;">
                    <div style="font-size: 11px; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 10px;">
                      Your One-Time Code
                    </div>
                    <div style="font-size: 42px; font-weight: 900; letter-spacing: 12px; color: #000000; font-family: -apple-system, BlinkMacSystemFont, 'SFMono-Regular', Consolas, 'Courier New', monospace; line-height: 1; padding: 6px 0 12px 12px;">
                      ${options.code}
                    </div>

                    <!-- Directly Linked Customer Email -->
                    <div style="padding-top: 14px; border-top: 1px solid #E5E7EB; font-size: 12px; color: #4B5563;">
                      Account Email: <strong style="color: #000000; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">${options.email}</strong>
                    </div>
                  </div>

                  <p style="margin: 0 0 10px 0; font-size: 13px; color: #374151; line-height: 1.5;">
                    ⏱️ This code is valid for <strong>10 minutes</strong>. For your security, do not share this code with anyone.
                  </p>
                  <p style="margin: 0; font-size: 12px; color: #9CA3AF; line-height: 1.5;">
                    If you did not request this verification, you can safely ignore this email.
                  </p>
                </td>
              </tr>

              <!-- Dark Black Enterprise Footer -->
              <tr>
                <td style="background-color: #000000; padding: 22px 28px; text-align: left; color: #9CA3AF; font-size: 12px; line-height: 1.5; border-top: 1px solid #1F2937;">
                  <div style="color: #FFFFFF; font-weight: 700; font-size: 13px; margin-bottom: 4px;">
                    Appampattu Mutta Mittai
                  </div>
                  <div>
                    Villupuram Railway Station, 1st Platform, Villupuram, Tamil Nadu - 605602
                  </div>
                  <div style="margin-top: 8px; font-size: 11px; color: #6B7280;">
                    Support: <a href="mailto:appampattueggsweets@gmail.com" style="color: #D1D5DB; text-decoration: underline;">appampattueggsweets@gmail.com</a> | WhatsApp: +91 78719 49015
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
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

// 🧾 CUSTOMER ORDER RECEIPT EMAIL (Enterprise Black & White Professional Theme)
export async function sendCustomerOrderReceiptEmail(
  order: {
    to: string;
    id: string;
    customerName: string;
    phone: string;
    weight: string;
    price: number;
    streetAddress?: string | null;
    city?: string | null;
    deliveryMethod?: string | null;
    transactionId?: string | null;
  },
  pdfAttachment?: { filename: string; buffer: Buffer }
): Promise<boolean> {
  const config = getConfig();
  const time = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const orderIdShort = order.id.slice(-8).toUpperCase();

  const subject = `Receipt & Order Confirmation #${orderIdShort} — Appampattu Mutta Mittai`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #F3F4F6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F3F4F6; padding: 32px 12px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" style="max-width: 560px; background-color: #FFFFFF; border-radius: 12px; border: 1px solid #E5E7EB; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06); overflow: hidden;" cellspacing="0" cellpadding="0">
              <!-- Dark Black Enterprise Header -->
              <tr>
                <td style="background-color: #000000; padding: 26px 28px; text-align: left; border-bottom: 1px solid #1F2937;">
                  <div style="font-size: 11px; font-weight: 700; color: #9CA3AF; text-transform: uppercase; letter-spacing: 2px;">
                    Official Receipt & Order Confirmation
                  </div>
                  <h1 style="margin: 6px 0 0 0; font-size: 20px; font-weight: 800; color: #FFFFFF; letter-spacing: 0.3px;">
                    Appampattu Mutta Mittai
                  </h1>
                </td>
              </tr>

              <!-- White Content Area with Crisp Dark Black Text -->
              <tr>
                <td style="padding: 32px 28px; background-color: #FFFFFF;">
                  <div style="display: inline-block; background-color: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 6px; padding: 4px 12px; font-size: 12px; font-weight: 700; color: #065F46; margin-bottom: 16px;">
                    ✓ PAYMENT CONFIRMED
                  </div>

                  <p style="margin: 0 0 16px 0; font-size: 16px; color: #111827; font-weight: 700;">
                    Thank you for your order, ${order.customerName}!
                  </p>
                  <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #374151;">
                    Your payment of <strong>₹${order.price}</strong> has been received successfully. Your authentic traditional sweet is being freshly packed for you.
                  </p>

                  <!-- Receipt Summary Table -->
                  <div style="background-color: #F9FAFB; border: 1.5px solid #E5E7EB; border-radius: 10px; padding: 20px; margin-bottom: 24px;">
                    <div style="font-size: 12px; font-weight: 700; color: #000000; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 14px; border-bottom: 1px solid #E5E7EB; padding-bottom: 8px;">
                      Order Summary
                    </div>
                    <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #1F2937;">
                      <tr>
                        <td style="padding: 6px 0; color: #6B7280; width: 140px;">Order ID:</td>
                        <td style="padding: 6px 0; font-family: monospace; font-weight: 700; color: #000000;">#${orderIdShort}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #6B7280;">Item / Pack Size:</td>
                        <td style="padding: 6px 0; font-weight: 600; color: #111827;">${order.weight}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #6B7280;">Amount Paid:</td>
                        <td style="padding: 6px 0; font-size: 15px; font-weight: 800; color: #000000;">₹${order.price}</td>
                      </tr>
                      ${order.deliveryMethod ? `<tr><td style="padding: 6px 0; color: #6B7280;">Fulfillment:</td><td style="padding: 6px 0; font-weight: 600; color: #111827;">${order.deliveryMethod}</td></tr>` : ''}
                      ${order.streetAddress ? `<tr><td style="padding: 6px 0; color: #6B7280;">Address:</td><td style="padding: 6px 0; color: #374151;">${order.streetAddress}, ${order.city || ''}</td></tr>` : ''}
                      ${order.transactionId ? `<tr><td style="padding: 6px 0; color: #6B7280;">Payment Reference:</td><td style="padding: 6px 0; font-family: monospace; color: #4B5563;">${order.transactionId}</td></tr>` : ''}
                      <tr>
                        <td style="padding: 6px 0; color: #6B7280;">Date & Time:</td>
                        <td style="padding: 6px 0; color: #4B5563;">${time}</td>
                      </tr>
                    </table>
                  </div>

                  <p style="margin: 0 0 10px 0; font-size: 13px; color: #374151; line-height: 1.5;">
                    📎 <strong>Your Official Tax Invoice is attached</strong> to this email as a PDF document for your records.
                  </p>
                  <p style="margin: 0; font-size: 12px; color: #6B7280; line-height: 1.5;">
                    If you have any questions regarding your delivery or pickup, you can reach us directly on WhatsApp at <strong>+91 78719 49015</strong>.
                  </p>
                </td>
              </tr>

              <!-- Dark Black Enterprise Footer -->
              <tr>
                <td style="background-color: #000000; padding: 22px 28px; text-align: left; color: #9CA3AF; font-size: 12px; line-height: 1.5; border-top: 1px solid #1F2937;">
                  <div style="color: #FFFFFF; font-weight: 700; font-size: 13px; margin-bottom: 4px;">
                    Appampattu Mutta Mittai
                  </div>
                  <div>
                    Villupuram Railway Station, 1st Platform, Villupuram, Tamil Nadu - 605602
                  </div>
                  <div style="margin-top: 8px; font-size: 11px; color: #6B7280;">
                    Support: <a href="mailto:appampattueggsweets@gmail.com" style="color: #D1D5DB; text-decoration: underline;">appampattueggsweets@gmail.com</a> | WhatsApp: +91 78719 49015
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  const text = `Thank you for your order, ${order.customerName}!\n\nYour payment of ₹${order.price} for order #${orderIdShort} has been confirmed.\n\nPack Size: ${order.weight}\nDelivery: ${order.deliveryMethod || 'Villupuram'}\nTransaction ID: ${order.transactionId || 'N/A'}\n\nYour PDF tax invoice is attached to this email.\n\nAppampattu Mutta Mittai\nVillupuram Railway Station, 1st Platform, Villupuram, Tamil Nadu - 605602`;

  const attachments = pdfAttachment
    ? [{ filename: pdfAttachment.filename, content: pdfAttachment.buffer }]
    : undefined;

  // 1. Send via Resend API (0% spam, authenticated domain)
  if (config.RESEND_API_KEY) {
    const resendSuccess = await sendViaResend({
      to: order.to,
      subject,
      html,
      text,
      attachments,
    });
    if (resendSuccess) {
      console.log(`[Email] ✅ Customer order receipt sent via Resend to ${order.to}`);
      return true;
    }
  }

  // 2. Fallback to SMTP
  const transport = getMailTransporter();
  if (transport) {
    try {
      await transport.sendMail({
        from: `"Appampattu Mutta Mittai" <${config.SMTP_USER || config.ADMIN_NOTIFICATION_EMAIL}>`,
        to: order.to,
        subject,
        html,
        text,
        attachments,
      });
      console.log(`[Email] ✅ Customer order receipt sent via SMTP to ${order.to}`);
      return true;
    } catch (err: unknown) {
      console.error(`[Email] Failed to send receipt to ${order.to}:`, (err as Error).message);
    }
  }

  return false;
}
