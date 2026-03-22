import { z } from 'zod';

export const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),

  // Server
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  // Authentication
  JWT_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),

  // CORS
  CORS_ORIGINS: z.string().default('http://localhost:4200'),

  // Email (SMTP)
  SMTP_HOST: z.string().default('smtp.ethereal.email'),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().default(''),
  SMTP_PASS: z.string().default(''),
  SMTP_FROM: z.string().default('noreply@canifed.app'),

  // Frontend URL (for invitation deep links)
  FRONTEND_URL: z.string().default('http://localhost:4200'),

  // Swagger
  SWAGGER_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((val) => val === 'true'),

  // Cloudflare R2 file storage (optional in dev, required in prod)
  R2_ENDPOINT: z.string().default(''),
  R2_ACCESS_KEY_ID: z.string().default(''),
  R2_SECRET_ACCESS_KEY: z.string().default(''),
  R2_BUCKET_NAME: z.string().default('canifed'),

  // HelloAsso Payment Integration
  HELLOASSO_CLIENT_ID: z.string().optional(),
  HELLOASSO_CLIENT_SECRET: z.string().optional(),
  HELLOASSO_ORG_SLUG: z.string().optional(),
  HELLOASSO_BASE_URL: z.string().url().default('https://api.helloasso-sandbox.com'),
  HELLOASSO_WEBHOOK_SECRET: z.string().optional(),

  // Stripe payments (optional — required when payment features are enabled)
  STRIPE_SECRET_KEY: z.string().default(''),
  STRIPE_WEBHOOK_SECRET: z.string().default(''),
  STRIPE_SUCCESS_URL: z.string().default('http://localhost:4200/payment/success?session_id={CHECKOUT_SESSION_ID}'),
  STRIPE_CANCEL_URL: z.string().default('http://localhost:4200/payment/cancelled'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(
  env: Record<string, unknown> = process.env
): Env {
  const result = envSchema.safeParse(env);
  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Environment validation failed:\n${formatted}`);
  }
  return result.data;
}
