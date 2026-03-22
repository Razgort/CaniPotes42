import { describe, it, expect } from 'vitest';
import { sendMessageSchema } from './chat.schema.js';

describe('sendMessageSchema', () => {
  const valid = {
    content: 'Hello everyone!',
    channelId: '550e8400-e29b-41d4-a716-446655440000',
  };

  it('should accept valid input', () => {
    const result = sendMessageSchema.parse(valid);
    expect(result.content).toBe('Hello everyone!');
  });

  it('should accept optional imageUrl', () => {
    const result = sendMessageSchema.parse({
      ...valid,
      imageUrl: 'https://example.com/photo.jpg',
    });
    expect(result.imageUrl).toBe('https://example.com/photo.jpg');
  });

  it('should work without optional imageUrl', () => {
    const result = sendMessageSchema.parse(valid);
    expect(result.imageUrl).toBeUndefined();
  });

  it('should reject empty content', () => {
    const result = sendMessageSchema.safeParse({ ...valid, content: '' });
    expect(result.success).toBe(false);
  });

  it('should reject content exceeding 4000 chars', () => {
    const result = sendMessageSchema.safeParse({
      ...valid,
      content: 'a'.repeat(4001),
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid channelId', () => {
    const result = sendMessageSchema.safeParse({
      ...valid,
      channelId: 'not-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid imageUrl', () => {
    const result = sendMessageSchema.safeParse({
      ...valid,
      imageUrl: 'not-url',
    });
    expect(result.success).toBe(false);
  });

  it('should reject missing required fields', () => {
    const result = sendMessageSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
