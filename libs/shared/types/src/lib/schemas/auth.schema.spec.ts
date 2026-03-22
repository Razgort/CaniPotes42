import { describe, it, expect } from 'vitest';
import { registerSchema, loginSchema } from './auth.schema.js';

describe('registerSchema', () => {
  const valid = { email: 'user@example.com', password: 'securepass123' };

  it('should accept valid input', () => {
    const result = registerSchema.parse(valid);
    expect(result.email).toBe('user@example.com');
    expect(result.password).toBe('securepass123');
  });

  it('should reject missing fields', () => {
    const result = registerSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('should reject invalid email', () => {
    const result = registerSchema.safeParse({ ...valid, email: 'not-email' });
    expect(result.success).toBe(false);
  });

  it('should reject short password', () => {
    const result = registerSchema.safeParse({ ...valid, password: '1234567' });
    expect(result.success).toBe(false);
  });

  it('should accept exactly 8 char password', () => {
    const result = registerSchema.parse({ ...valid, password: '12345678' });
    expect(result.password).toBe('12345678');
  });
});

describe('loginSchema', () => {
  const valid = { email: 'user@example.com', password: 'anypass' };

  it('should accept valid input', () => {
    const result = loginSchema.parse(valid);
    expect(result.email).toBe('user@example.com');
  });

  it('should reject empty password', () => {
    const result = loginSchema.safeParse({ ...valid, password: '' });
    expect(result.success).toBe(false);
  });

  it('should reject missing fields', () => {
    const result = loginSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
