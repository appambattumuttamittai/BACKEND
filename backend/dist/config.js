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
    FRONTEND_URL: zod_1.z.string().default('*'),
    ADMIN_USERNAME: zod_1.z.string().default('admin'),
    ADMIN_PASSWORD_HASH: zod_1.z.string().default('$2b$10$placeholder_hash_change_me_asap'),
    ADMIN_SESSION_SECRET: zod_1.z.string().default('default-session-secret-change-me-32ch'),
    // OTP Provider selection ('firebase' | 'msg91')
    OTP_PROVIDER: zod_1.z.string().default('firebase'),
    // MSG91 configuration (for production)
    MSG91_AUTH_KEY: zod_1.z.string().optional().default(''),
    MSG91_TEMPLATE_ID: zod_1.z.string().optional().default(''),
    MSG91_OTP_EXPIRY_MINUTES: zod_1.z
        .string()
        .default('10')
        .transform((v) => parseInt(v, 10)),
    // Firebase Authentication configuration (for testing / dev)
    FIREBASE_API_KEY: zod_1.z.string().optional().default(''),
    FIREBASE_PROJECT_ID: zod_1.z.string().optional().default(''),
    FIREBASE_CLIENT_EMAIL: zod_1.z.string().optional().default(''),
    FIREBASE_PRIVATE_KEY: zod_1.z.string().optional().default(''),
    FIREBASE_TEST_MODE: zod_1.z
        .string()
        .default('true')
        .transform((v) => v === 'true' || v === '1'),
    FIREBASE_TEST_OTP: zod_1.z.string().default('123456'),
    TELEGRAM_BOT_TOKEN: zod_1.z.string().optional().default(''),
    TELEGRAM_CHAT_ID: zod_1.z.string().optional().default(''),
    GOOGLE_SERVICE_ACCOUNT_JSON: zod_1.z.string().optional().default('{}'),
    GOOGLE_SHEETS_SPREADSHEET_ID: zod_1.z.string().optional().default(''),
    GOOGLE_SHEETS_SHEET_NAME: zod_1.z.string().default('Orders'),
    GOOGLE_SHEETS_URL: zod_1.z.string().optional(),
    RAZORPAY_KEY_ID: zod_1.z.string().optional().default(''),
    RAZORPAY_KEY_SECRET: zod_1.z.string().optional().default(''),
    RAZORPAY_WEBHOOK_SECRET: zod_1.z.string().optional().default(''),
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