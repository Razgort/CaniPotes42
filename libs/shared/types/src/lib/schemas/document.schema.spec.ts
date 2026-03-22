import { describe, it, expect } from 'vitest';
import { uploadDocumentSchema } from './document.schema.js';
import { DocumentType } from '../enums.js';

describe('uploadDocumentSchema', () => {
  it('should accept valid input with required field only', () => {
    const result = uploadDocumentSchema.parse({
      type: DocumentType.VACCINE_CERTIFICATE,
    });
    expect(result.type).toBe(DocumentType.VACCINE_CERTIFICATE);
  });

  it('should accept optional fields', () => {
    const result = uploadDocumentSchema.parse({
      type: DocumentType.HEALTH_RECORD,
      expiryDate: '2027-01-01',
      associatedDogId: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.expiryDate).toBe('2027-01-01');
    expect(result.associatedDogId).toBe(
      '550e8400-e29b-41d4-a716-446655440000'
    );
  });

  it('should reject missing type', () => {
    const result = uploadDocumentSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('should reject invalid document type', () => {
    const result = uploadDocumentSchema.safeParse({ type: 'INVALID' });
    expect(result.success).toBe(false);
  });

  it('should reject invalid UUID for associatedDogId', () => {
    const result = uploadDocumentSchema.safeParse({
      type: DocumentType.LICENSE,
      associatedDogId: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid date format for expiryDate', () => {
    const result = uploadDocumentSchema.safeParse({
      type: DocumentType.LICENSE,
      expiryDate: 'Jan 2027',
    });
    expect(result.success).toBe(false);
  });
});
