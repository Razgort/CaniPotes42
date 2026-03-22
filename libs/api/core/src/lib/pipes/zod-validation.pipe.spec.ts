import { describe, it, expect } from 'vitest';
import { ZodValidationPipe } from './zod-validation.pipe.js';
import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';

describe('ZodValidationPipe', () => {
  const schema = z.object({
    email: z.string().email(),
    name: z.string().min(1),
  });

  const pipe = new ZodValidationPipe(schema);

  it('should return parsed data on valid input', () => {
    const input = { email: 'test@example.com', name: 'Alice' };
    const result = pipe.transform(input);

    expect(result).toEqual(input);
  });

  it('should strip unknown fields (coercion)', () => {
    const input = { email: 'test@example.com', name: 'Alice', extra: 'field' };
    const result = pipe.transform(input);

    expect(result).toEqual({ email: 'test@example.com', name: 'Alice' });
  });

  it('should throw BadRequestException on invalid input', () => {
    const input = { email: 'not-an-email', name: '' };

    expect(() => pipe.transform(input)).toThrow(BadRequestException);
  });

  it('should include field-level details in validation error', () => {
    const input = { email: 'not-an-email', name: '' };

    try {
      pipe.transform(input);
      expect.fail('Expected BadRequestException');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const response = (error as BadRequestException).getResponse() as any;
      expect(response.details).toBeDefined();
      expect(response.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'email' }),
          expect.objectContaining({ field: 'name' }),
        ]),
      );
    }
  });

  it('should handle nested field paths', () => {
    const nestedSchema = z.object({
      address: z.object({
        city: z.string().min(1),
      }),
    });
    const nestedPipe = new ZodValidationPipe(nestedSchema);

    try {
      nestedPipe.transform({ address: { city: '' } });
      expect.fail('Expected BadRequestException');
    } catch (error) {
      const response = (error as BadRequestException).getResponse() as any;
      expect(response.details[0].field).toBe('address.city');
    }
  });
});
