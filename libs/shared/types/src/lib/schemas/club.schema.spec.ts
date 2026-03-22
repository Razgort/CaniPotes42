import { describe, it, expect } from 'vitest';
import { createClubSchema, updateClubSchema } from './club.schema.js';

describe('createClubSchema', () => {
  const valid = {
    name: 'Cani Potes 42',
    federation: 'FFSLC',
    contactEmail: 'contact@canipotes42.fr',
  };

  it('should accept valid input', () => {
    const result = createClubSchema.parse(valid);
    expect(result.name).toBe('Cani Potes 42');
  });

  it('should reject missing required fields', () => {
    const result = createClubSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('should accept optional fields', () => {
    const result = createClubSchema.parse({
      ...valid,
      logo: 'https://example.com/logo.png',
      description: 'A great club',
    });
    expect(result.logo).toBe('https://example.com/logo.png');
    expect(result.description).toBe('A great club');
  });

  it('should work without optional fields', () => {
    const result = createClubSchema.parse(valid);
    expect(result.logo).toBeUndefined();
    expect(result.description).toBeUndefined();
  });

  it('should reject invalid logo URL', () => {
    const result = createClubSchema.safeParse({ ...valid, logo: 'not-a-url' });
    expect(result.success).toBe(false);
  });

  it('should reject invalid contact email', () => {
    const result = createClubSchema.safeParse({
      ...valid,
      contactEmail: 'bad',
    });
    expect(result.success).toBe(false);
  });

  it('should reject name exceeding 100 chars', () => {
    const result = createClubSchema.safeParse({
      ...valid,
      name: 'a'.repeat(101),
    });
    expect(result.success).toBe(false);
  });
});

describe('updateClubSchema', () => {
  it('should accept empty object (all fields optional)', () => {
    const result = updateClubSchema.parse({});
    expect(result).toEqual({});
  });

  it('should accept any subset of fields', () => {
    const result = updateClubSchema.parse({ name: 'New Name' });
    expect(result.name).toBe('New Name');
  });
});
