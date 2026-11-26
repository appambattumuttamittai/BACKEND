import { PrismaClient } from '@prisma/client';
import {
  sendOtp as providerSendOtp,
  verifyOtp as providerVerifyOtp,
} from '../../services/otp';
import { sendCustomerOtpEmail } from '../../services/email.service';
import { getConfig } from '../../config';

export async function initiateOtp(
  prisma: PrismaClient,
  phone: string,
  email?: string,
  customerName?: string
): Promise<string> {
  // Check recent sends - prevent spam (allow up to 5 sends in 5 minutes)
  const recent = await prisma.otpSession.count({
    where: {
      phone,
      createdAt: { gt: new Date(Date.now() - 5 * 60 * 1000) },
    },
  });
  if (recent >= 5) {
    throw new Error('TOO_MANY_REQUESTS');
  }

  // Generate a random 6-digit OTP code valid for 10 minutes
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  // Create session in Neon DB with 10-minute expiry
  const session = await prisma.otpSession.create({
    data: {
      phone,
      email: email || null,
      otpCode: code,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    },
  });

  // Persist OTP code in Neon DB AppConfig
  const otpPayload = {
    code,
    phone,
    email: email || '',
    expiresAt: Date.now() + 10 * 60 * 1000,
  };

  await prisma.appConfig.upsert({
    where: { key: `otp:${session.id}` },
    create: {
      key: `otp:${session.id}`,
      value: JSON.stringify(otpPayload),
    },
    update: {
      value: JSON.stringify(otpPayload),
    },
  });

  console.log(
    `[OTP Service] 🔑 Generated 6-digit OTP for ${email || phone}: ${code} (Session: ${session.id}, Expires in 10 mins)`
  );

  // If customer provided email, send OTP directly to their Gmail
  if (email && email.trim().length > 0) {
    await sendCustomerOtpEmail({
      email: email.trim(),
      customerName,
      code,
    });
  } else {
    // Fallback to SMS provider if no email provided
    try {
      await providerSendOtp(phone);
    } catch (err) {
      console.warn(
        '[OTP Service] Provider SMS send failed (non-fatal, session created):',
        (err as Error).message
      );
    }
  }

  return session.id;
}

export async function validateOtp(
  prisma: PrismaClient,
  phone: string,
  code: string,
  sessionId?: string
): Promise<{ valid: boolean; sessionId: string | null }> {
  const trimmedCode = code.trim();

  // Completely block dummy / bypass OTPs (e.g. 123456, 098765)
  if (
    trimmedCode === '123456' ||
    trimmedCode === '098765' ||
    trimmedCode === '000000' ||
    trimmedCode === '111111'
  ) {
    const sessionCheck = sessionId
      ? await prisma.otpSession.findUnique({ where: { id: sessionId } })
      : null;
    if (!sessionCheck || sessionCheck.otpCode !== trimmedCode) {
      console.warn(`[OTP Validate] 🚫 Blocked dummy OTP attempt: ${trimmedCode}`);
      return { valid: false, sessionId: null };
    }
  }

  if (sessionId) {
    const session = await prisma.otpSession.findFirst({
      where: {
        id: sessionId,
        phone,
        expiresAt: { gt: new Date() },
        verified: false,
      },
    });

    if (!session) return { valid: false, sessionId: null };
    if (session.attempts >= 5) return { valid: false, sessionId: null };

    await prisma.otpSession.update({
      where: { id: sessionId },
      data: { attempts: { increment: 1 } },
    });

    let isValid = false;

    // 1. Direct check against session otpCode stored in Neon DB
    if (session.otpCode && session.otpCode === trimmedCode) {
      isValid = true;
    }

    // 2. Verify against Neon DB AppConfig stored OTP
    if (!isValid) {
      try {
        const configOtp = await prisma.appConfig.findUnique({
          where: { key: `otp:${sessionId}` },
        });
        if (configOtp) {
          const data = JSON.parse(configOtp.value);
          if (data.code === trimmedCode && Date.now() <= data.expiresAt) {
            isValid = true;
          }
        }
      } catch (err) {
        console.error('[OTP Validate] Error checking AppConfig OTP:', err);
      }
    }

    if (!isValid) return { valid: false, sessionId };

    // Mark session verified in DB and store permanent audit in AppConfig
    await prisma.otpSession.update({
      where: { id: sessionId },
      data: { verified: true },
    });

    await prisma.appConfig
      .upsert({
        where: { key: `otp_history:${sessionId}` },
        create: {
          key: `otp_history:${sessionId}`,
          value: JSON.stringify({
            sessionId,
            phone,
            code: trimmedCode,
            verified: true,
            verifiedAt: new Date().toISOString(),
          }),
        },
        update: {
          value: JSON.stringify({
            sessionId,
            phone,
            code: trimmedCode,
            verified: true,
            verifiedAt: new Date().toISOString(),
          }),
        },
      })
      .catch(() => {});

    await prisma.appConfig
      .delete({
        where: { key: `otp:${sessionId}` },
      })
      .catch(() => {});

    return { valid: true, sessionId };
  }

  // Without a valid session ID, reject immediately
  return { valid: false, sessionId: null };
}
