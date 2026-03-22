import { describe, it, expect } from 'vitest';
import {
  createLicenseTypeSchema,
  updateLicenseTypeSchema,
  initiatePaymentSchema,
} from './payment.schema.js';

describe('createLicenseTypeSchema', () => {
  const valid = {
    name: 'Licence annuelle',
    amount: 50,
    season: '2025-2026',
    paymentProvider: 'STRIPE' as const,
  };

  it('should accept valid STRIPE input', () => {
    const result = createLicenseTypeSchema.parse(valid);
    expect(result.name).toBe('Licence annuelle');
    expect(result.amount).toBe(50);
    expect(result.paymentProvider).toBe('STRIPE');
  });

  it('should accept valid HELLOASSO input', () => {
    const result = createLicenseTypeSchema.parse({
      ...valid,
      paymentProvider: 'HELLOASSO',
    });
    expect(result.paymentProvider).toBe('HELLOASSO');
  });

  it('should reject missing paymentProvider', () => {
    const { paymentProvider: _, ...withoutProvider } = valid;
    const result = createLicenseTypeSchema.safeParse(withoutProvider);
    expect(result.success).toBe(false);
  });

  it('should reject invalid paymentProvider value', () => {
    const result = createLicenseTypeSchema.safeParse({
      ...valid,
      paymentProvider: 'PAYPAL',
    });
    expect(result.success).toBe(false);
  });

  it('should reject missing fields', () => {
    const result = createLicenseTypeSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('should reject zero amount', () => {
    const result = createLicenseTypeSchema.safeParse({ ...valid, amount: 0 });
    expect(result.success).toBe(false);
  });

  it('should reject negative amount', () => {
    const result = createLicenseTypeSchema.safeParse({ ...valid, amount: -100 });
    expect(result.success).toBe(false);
  });

  it('should reject non-integer amount', () => {
    const result = createLicenseTypeSchema.safeParse({ ...valid, amount: 45.5 });
    expect(result.success).toBe(false);
  });

  it('should reject empty name', () => {
    const result = createLicenseTypeSchema.safeParse({ ...valid, name: '' });
    expect(result.success).toBe(false);
  });
});

describe('updateLicenseTypeSchema', () => {
  it('should accept partial update with only name', () => {
    const result = updateLicenseTypeSchema.parse({ name: 'Nouveau nom' });
    expect(result.name).toBe('Nouveau nom');
    expect(result.amount).toBeUndefined();
  });

  it('should accept partial update with only paymentProvider', () => {
    const result = updateLicenseTypeSchema.parse({ paymentProvider: 'HELLOASSO' });
    expect(result.paymentProvider).toBe('HELLOASSO');
  });

  it('should accept empty object (all fields optional)', () => {
    const result = updateLicenseTypeSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('should still reject invalid paymentProvider', () => {
    const result = updateLicenseTypeSchema.safeParse({ paymentProvider: 'CRYPTO' });
    expect(result.success).toBe(false);
  });
});

describe('initiatePaymentSchema', () => {
  it('should accept valid UUID', () => {
    const result = initiatePaymentSchema.parse({
      licenseTypeId: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.licenseTypeId).toBe('550e8400-e29b-41d4-a716-446655440000');
  });

  it('should reject invalid UUID', () => {
    const result = initiatePaymentSchema.safeParse({ licenseTypeId: 'not-uuid' });
    expect(result.success).toBe(false);
  });

  it('should reject missing licenseTypeId', () => {
    const result = initiatePaymentSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
