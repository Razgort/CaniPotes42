import { describe, it, expect } from 'vitest';
import { envSchema, validateEnv } from './env.schema.js';

describe('envSchema', () => {
  const validEnv = {
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/canifed',
    JWT_SECRET: 'dev-jwt-secret-change-in-production',
    JWT_REFRESH_SECRET: 'dev-jwt-refresh-secret-change-in-production',
  };

  it('should accept valid environment with defaults', () => {
    const result = envSchema.parse(validEnv);
    expect(result.DATABASE_URL).toBe(
      'postgresql://user:pass@localhost:5432/canifed'
    );
    expect(result.NODE_ENV).toBe('development');
    expect(result.PORT).toBe(3000);
    expect(result.CORS_ORIGINS).toBe('http://localhost:4200');
    expect(result.SWAGGER_ENABLED).toBe(true);
  });

  it('should coerce PORT from string to number', () => {
    const result = envSchema.parse({ ...validEnv, PORT: '8080' });
    expect(result.PORT).toBe(8080);
  });

  it('should parse SWAGGER_ENABLED as boolean', () => {
    expect(
      envSchema.parse({ ...validEnv, SWAGGER_ENABLED: 'false' })
        .SWAGGER_ENABLED
    ).toBe(false);
    expect(
      envSchema.parse({ ...validEnv, SWAGGER_ENABLED: 'true' })
        .SWAGGER_ENABLED
    ).toBe(true);
  });

  it('should reject missing required fields', () => {
    const result = envSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('should reject short JWT_SECRET', () => {
    const result = envSchema.safeParse({
      ...validEnv,
      JWT_SECRET: 'short',
    });
    expect(result.success).toBe(false);
  });

  it('should reject short JWT_REFRESH_SECRET', () => {
    const result = envSchema.safeParse({
      ...validEnv,
      JWT_REFRESH_SECRET: 'short',
    });
    expect(result.success).toBe(false);
  });

  it('should accept valid NODE_ENV values', () => {
    expect(
      envSchema.parse({ ...validEnv, NODE_ENV: 'production' }).NODE_ENV
    ).toBe('production');
    expect(
      envSchema.parse({ ...validEnv, NODE_ENV: 'test' }).NODE_ENV
    ).toBe('test');
  });

  it('should reject invalid NODE_ENV', () => {
    const result = envSchema.safeParse({
      ...validEnv,
      NODE_ENV: 'staging',
    });
    expect(result.success).toBe(false);
  });
});

describe('validateEnv', () => {
  const validEnv = {
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/canifed',
    JWT_SECRET: 'dev-jwt-secret-change-in-production',
    JWT_REFRESH_SECRET: 'dev-jwt-refresh-secret-change-in-production',
  };

  it('should return parsed env on valid input', () => {
    const result = validateEnv(validEnv);
    expect(result.DATABASE_URL).toBe(
      'postgresql://user:pass@localhost:5432/canifed'
    );
  });

  it('should throw on invalid input', () => {
    expect(() => validateEnv({})).toThrow('Environment validation failed');
  });

  it('should include field names in error message', () => {
    try {
      validateEnv({});
    } catch (e) {
      expect((e as Error).message).toContain('DATABASE_URL');
    }
  });
});
