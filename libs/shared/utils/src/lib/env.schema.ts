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

  // Swagger
  SWAGGER_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((val) => val === 'true'),
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
