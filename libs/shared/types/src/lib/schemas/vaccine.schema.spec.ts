import { describe, it, expect } from 'vitest';
import { createVaccineSchema } from './vaccine.schema.js';

describe('createVaccineSchema', () => {
  const valid = {
    vaccineName: 'Rabies',
    dateAdministered: '2025-06-01',
    expiryDate: '2026-06-01',
  };

  it('should accept valid input', () => {
    const result = createVaccineSchema.parse(valid);
    expect(result.vaccineName).toBe('Rabies');
  });

  it('should reject missing required fields', () => {
    const result = createVaccineSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('should reject empty vaccine name', () => {
    const result = createVaccineSchema.safeParse({
      ...valid,
      vaccineName: '',
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid date format', () => {
    const result = createVaccineSchema.safeParse({
      ...valid,
      dateAdministered: 'June 2025',
    });
    expect(result.success).toBe(false);
  });
});
