import { describe, it, expect } from 'vitest';
import { createEventSchema, updateEventSchema } from './event.schema.js';
import { EventStatus } from '../enums.js';

describe('createEventSchema', () => {
  const valid = {
    title: 'Weekend Hike',
    description: 'A fun hike with dogs',
    dateTime: '2026-04-15T10:00:00Z',
    latitude: 45.4397,
    longitude: 4.3872,
  };

  it('should accept valid input', () => {
    const result = createEventSchema.parse(valid);
    expect(result.title).toBe('Weekend Hike');
    expect(result.status).toBe(EventStatus.DRAFT);
  });

  it('should default status to DRAFT', () => {
    const result = createEventSchema.parse(valid);
    expect(result.status).toBe(EventStatus.DRAFT);
  });

  it('should accept explicit status', () => {
    const result = createEventSchema.parse({
      ...valid,
      status: EventStatus.PUBLISHED,
    });
    expect(result.status).toBe(EventStatus.PUBLISHED);
  });

  it('should reject missing required fields', () => {
    const result = createEventSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('should reject invalid dateTime', () => {
    const result = createEventSchema.safeParse({
      ...valid,
      dateTime: 'not-a-date',
    });
    expect(result.success).toBe(false);
  });

  it('should reject latitude out of range', () => {
    expect(
      createEventSchema.safeParse({ ...valid, latitude: 91 }).success
    ).toBe(false);
    expect(
      createEventSchema.safeParse({ ...valid, latitude: -91 }).success
    ).toBe(false);
  });

  it('should reject longitude out of range', () => {
    expect(
      createEventSchema.safeParse({ ...valid, longitude: 181 }).success
    ).toBe(false);
    expect(
      createEventSchema.safeParse({ ...valid, longitude: -181 }).success
    ).toBe(false);
  });
});

describe('updateEventSchema', () => {
  it('should accept empty object (status excluded — use PATCH for status)', () => {
    const result = updateEventSchema.parse({});
    expect(result).toEqual({});
  });

  it('should accept partial fields', () => {
    const result = updateEventSchema.parse({ title: 'New Title' });
    expect(result.title).toBe('New Title');
  });
});
