import { PrismaClient } from '@prisma/client';
export declare function initiateOtp(prisma: PrismaClient, phone: string): Promise<string>;
export declare function validateOtp(prisma: PrismaClient, phone: string, code: string, sessionId?: string): Promise<{
    valid: boolean;
    sessionId: string | null;
}>;
