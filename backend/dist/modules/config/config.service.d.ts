import { PrismaClient } from '@prisma/client';
export declare function getQrImageUrl(prisma: PrismaClient): Promise<string>;
export declare function setQrImageUrl(prisma: PrismaClient, url: string): Promise<string>;
