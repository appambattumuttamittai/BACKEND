"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConfig = getConfig;
const zod_1 = require("zod");
const envSchema = zod_1.z.object({
    DATABASE_URL: zod_1.z.string().min(1),
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('production'),
    PORT: zod_1.z
        .string()
        .default('3001')
        .transform((v) => parseInt(v, 10)),
    FRONTEND_URL: zod_1.z.string().min(1),
    ADMIN_USERNAME: zod_1.z.string().min(1),
    ADMIN_PASSWORD_HASH: zod_1.z.string().min(1),
    ADMIN_SESSION_SECRET: zod_1.z.string().min(32),
    TWILIO_ACCOUNT_SID: zod_1.z.string().min(1),
    TWILIO_AUTH_TOKEN: zod_1.z.string().min(1),
    TWILIO_VERIFY_SERVICE_SID: zod_1.z.string().min(1),
    TELEGRAM_BOT_TOKEN: zod_1.z.string().min(1),
    TELEGRAM_CHAT_ID: zod_1.z.string().min(1),
    GOOGLE_SERVICE_ACCOUNT_JSON: zod_1.z.string().min(1),
    GOOGLE_SHEETS_SPREADSHEET_ID: zod_1.z.string().min(1),
    GOOGLE_SHEETS_SHEET_NAME: zod_1.z.string().default('Orders'),
    GOOGLE_SHEETS_URL: zod_1.z.string().optional(),
    QR_IMAGE_URL: zod_1.z.string().optional(),
});
let _config = null;
function getConfig() {
    if (!_config) {
        const result = envSchema.safeParse(process.env);
        if (!result.success) {
            console.error('Invalid environment variables:', JSON.stringify(result.error.flatten(), null, 2));
            process.exit(1);
        }
        _config = result.data;
    }
    return _config;
}
//# sourceMappingURL=config.js.map