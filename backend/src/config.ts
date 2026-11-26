import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1).transform((v) => v.replace(/^["']|["']$/g, '').trim()),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
  PORT: z
    .string()
    .default('3001')
    .transform((v) => parseInt(v, 10)),
  FRONTEND_URL: z.string().default('*'),
  // Primary Admin (Admin 1)
  ADMIN_USERNAME: z.string().default('admin'),
  ADMIN_PASSWORD_HASH: z.string().default('$2b$10$placeholder_hash_change_me_asap'),
  ADMIN_PASSWORD: z.string().optional().default(''),

  // Secondary Admin (Admin 2)
  ADMIN_2_USERNAME: z.string().optional().default(''),
  ADMIN_2_PASSWORD_HASH: z.string().optional().default(''),
  ADMIN_2_PASSWORD: z.string().optional().default(''),

  ADMIN_SESSION_SECRET: z.string().default('default-session-secret-change-me-32ch'),
  // OTP Provider selection ('firebase' | 'msg91')
  OTP_PROVIDER: z.string().default('firebase'),
  // MSG91 configuration (for production)
  MSG91_AUTH_KEY: z.string().optional().default(''),
  MSG91_TEMPLATE_ID: z.string().optional().default(''),
  MSG91_OTP_EXPIRY_MINUTES: z
    .string()
    .default('10')
    .transform((v) => parseInt(v, 10)),
  // Firebase Authentication configuration (for testing / dev)
  FIREBASE_API_KEY: z.string().optional().default(''),
  FIREBASE_PROJECT_ID: z.string().optional().default(''),
  FIREBASE_CLIENT_EMAIL: z.string().optional().default(''),
  FIREBASE_PRIVATE_KEY: z.string().optional().default(''),
  FIREBASE_TEST_MODE: z
    .string()
    .default('false')
    .transform((v) => v === 'true' || v === '1'),
  FIREBASE_TEST_OTP: z.string().default(''),
  TELEGRAM_BOT_TOKEN: z.string().optional().default(''),
  TELEGRAM_CHAT_ID: z.string().optional().default(''),
  GOOGLE_SERVICE_ACCOUNT_JSON: z.string().optional().default('{}'),
  GOOGLE_SHEETS_SPREADSHEET_ID: z.string().optional().default(''),
  GOOGLE_SHEETS_SHEET_NAME: z.string().default('Orders'),
  GOOGLE_SHEETS_URL: z.string().optional(),
  GOOGLE_REVIEW_URL: z.string().optional().default(''),
  RAZORPAY_KEY_ID: z.string().optional().default(''),
  RAZORPAY_KEY_SECRET: z.string().optional().default(''),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional().default(''),
  // Admin Email Notification Settings
  ADMIN_NOTIFICATION_EMAIL: z.string().default('appampattueggsweets@gmail.com'),
  GMAIL_APP_PASSWORD: z.string().optional().default(''),
  RESEND_API_KEY: z.string().optional().default(''),
  RESEND_FROM_EMAIL: z.string().default('orders@appampattueggsweet.com'),
  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z
    .string()
    .default('465')
    .transform((v) => parseInt(v, 10)),
  SMTP_USER: z.string().default('appampattueggsweets@gmail.com'),
});

export type Env = z.infer<typeof envSchema>;

let _config: Env | null = null;

export function getConfig(): Env {
  if (!_config) {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
      console.error(
        'Invalid environment variables:',
        JSON.stringify(result.error.flatten(), null, 2)
      );
      process.exit(1);
    }
    _config = result.data as Env;
  }
  return _config as Env;
}
