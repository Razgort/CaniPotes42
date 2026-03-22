import { describe, it, expect } from 'vitest';
import { createDogSchema, updateDogSchema } from './dog.schema.js';

describe('createDogSchema', () => {
  it('should accept valid input with required field only', () => {
    const result = createDogSchema.parse({ name: 'Rex' });
    expect(result.name).toBe('Rex');
    expect(result.breed).toBeUndefined();
  });

  it('should accept all optional fields', () => {
    const result = createDogSchema.parse({
      name: 'Rex',
      breed: 'Labrador',
      birthdate: '2020-05-15',
      chipNumber: '250269600123456',
      photo: 'https://example.com/rex.jpg',
    });
    expect(result.breed).toBe('Labrador');
    expect(result.birthdate).toBe('2020-05-15');
  });

  it('should reject empty name', () => {
    const result = createDogSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });

  it('should reject invalid birthdate format', () => {
    const result = createDogSchema.safeParse({
      name: 'Rex',
      birthdate: 'May 15 2020',
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid photo URL', () => {
    const result = createDogSchema.safeParse({
      name: 'Rex',
      photo: 'not-url',
    });
    expect(result.success).toBe(false);
  });
});

describe('updateDogSchema', () => {
  it('should accept empty object', () => {
    const result = updateDogSchema.parse({});
    expect(result).toEqual({});
  });

  it('should accept partial fields', () => {
    const result = updateDogSchema.parse({ breed: 'Golden Retriever' });
    expect(result.breed).toBe('Golden Retriever');
  });
});
