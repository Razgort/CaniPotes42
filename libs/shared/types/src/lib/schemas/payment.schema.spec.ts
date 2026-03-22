import { describe, it, expect } from 'vitest';
import {
  createLicenseTypeSchema,
  initiatePaymentSchema,
} from './payment.schema.js';

describe('createLicenseTypeSchema', () => {
  const valid = { name: 'Annual License', amount: 4500, season: '2025-2026' };

  it('should accept valid input', () => {
    const result = createLicenseTypeSchema.parse(valid);
    expect(result.name).toBe('Annual License');
    expect(result.amount).toBe(4500);
  });

  it('should reject missing fields', () => {
    const result = createLicenseTypeSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('should reject zero amount', () => {
    const result = createLicenseTypeSchema.safeParse({
      ...valid,
      amount: 0,
    });
    expect(result.success).toBe(false);
  });

  it('should reject negative amount', () => {
    const result = createLicenseTypeSchema.safeParse({
      ...valid,
      amount: -100,
    });
    expect(result.success).toBe(false);
  });

  it('should reject non-integer amount', () => {
    const result = createLicenseTypeSchema.safeParse({
      ...valid,
      amount: 45.5,
    });
    expect(result.success).toBe(false);
  });

  it('should reject empty name', () => {
    const result = createLicenseTypeSchema.safeParse({ ...valid, name: '' });
    expect(result.success).toBe(false);
  });
});

describe('initiatePaymentSchema', () => {
  it('should accept valid UUID', () => {
    const result = initiatePaymentSchema.parse({
      licenseTypeId: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.licenseTypeId).toBe(
      '550e8400-e29b-41d4-a716-446655440000'
    );
  });

  it('should reject invalid UUID', () => {
    const result = initiatePaymentSchema.safeParse({
      licenseTypeId: 'not-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('should reject missing licenseTypeId', () => {
    const result = initiatePaymentSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
