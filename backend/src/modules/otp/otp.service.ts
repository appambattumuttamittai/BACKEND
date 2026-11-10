import { PrismaClient } from '@prisma/client';
import {
  sendOtp as providerSendOtp,
  verifyOtp as providerVerifyOtp,
} from '../../services/otp';

export async function initiateOtp(
  prisma: PrismaClient,
  phone: string
): Promise<string> {
  // Check recent sends - prevent spam
  const recent = await prisma.otpSession.count({
    where: {
      phone,
      createdAt: { gt: new Date(Date.now() - 5 * 60 * 1000) },
    },
  });
  if (recent >= 3) {
    throw new Error('TOO_MANY_REQUESTS');
  }

  await providerSendOtp(phone);

  const session = await prisma.otpSession.create({
    data: {
      phone,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    },
  });

  return session.id;
}

export async function validateOtp(
  prisma: PrismaClient,
  phone: string,
  code: string,
  sessionId?: string
): Promise<{ valid: boolean; sessionId: string | null }> {
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
  }

  const verified = await providerVerifyOtp(phone, code, sessionId);
  if (!verified) return { valid: false, sessionId: sessionId || null };

  if (sessionId) {
    await prisma.otpSession.update({
      where: { id: sessionId },
      data: { verified: true },
    });
  }

  return { valid: true, sessionId: sessionId || null };
}
