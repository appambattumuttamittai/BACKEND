"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getQrImageUrl = getQrImageUrl;
exports.setQrImageUrl = setQrImageUrl;
const config_1 = require("../../config");
async function getQrImageUrl(prisma) {
    const config = (0, config_1.getConfig)();
    if (config.QR_IMAGE_URL)
        return config.QR_IMAGE_URL;
    const dbConfig = await prisma.appConfig.findUnique({
        where: { key: 'qr_image_url' },
    });
    if (dbConfig?.value)
        return dbConfig.value;
    return '/gpayQR.png'; // frontend public file fallback
}
async function setQrImageUrl(prisma, url) {
    await prisma.appConfig.upsert({
        where: { key: 'qr_image_url' },
        update: { value: url },
        create: { key: 'qr_image_url', value: url },
    });
    return url;
}
//# sourceMappingURL=config.service.js.map