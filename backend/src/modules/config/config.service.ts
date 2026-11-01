import { PrismaClient } from '@prisma/client';
import { getConfig } from '../../config';

export async function getQrImageUrl(prisma: PrismaClient): Promise<string> {
  const config = getConfig();
  if (config.QR_IMAGE_URL) return config.QR_IMAGE_URL;

  const dbConfig = await prisma.appConfig.findUnique({
    where: { key: 'qr_image_url' },
  });
  if (dbConfig?.value) return dbConfig.value;

  return '/gpayQR.png'; // frontend public file fallback
}

export async function setQrImageUrl(
  prisma: PrismaClient,
  url: string
): Promise<string> {
  await prisma.appConfig.upsert({
    where: { key: 'qr_image_url' },
    update: { value: url },
    create: { key: 'qr_image_url', value: url },
  });
  return url;
}
