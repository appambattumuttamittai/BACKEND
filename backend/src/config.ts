import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
  PORT: z
    .string()
    .default('3001')
    .transform((v) => parseInt(v, 10)),
  FRONTEND_URL: z.string().min(1),
  ADMIN_USERNAME: z.string().min(1),
  ADMIN_PASSWORD_HASH: z.string().min(1),
  ADMIN_SESSION_SECRET: z.string().min(32),
  TWILIO_ACCOUNT_SID: z.string().min(1),
  TWILIO_AUTH_TOKEN: z.string().min(1),
  TWILIO_VERIFY_SERVICE_SID: z.string().min(1),
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  TELEGRAM_CHAT_ID: z.string().min(1),
  GOOGLE_SERVICE_ACCOUNT_JSON: z.string().min(1),
  GOOGLE_SHEETS_SPREADSHEET_ID: z.string().min(1),
  GOOGLE_SHEETS_SHEET_NAME: z.string().default('Orders'),
  GOOGLE_SHEETS_URL: z.string().optional(),
  QR_IMAGE_URL: z.string().optional(),
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
