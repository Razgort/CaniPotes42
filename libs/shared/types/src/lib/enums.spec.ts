import { describe, it, expect } from 'vitest';
import {
  Role,
  EventStatus,
  ParticipationStatus,
  VaccineStatus,
  PaymentStatus,
  DocumentType,
} from './enums.js';

describe('Role enum', () => {
  it('should have exactly OWNER, ADMIN, MEMBER', () => {
    expect(Object.values(Role)).toEqual(['OWNER', 'ADMIN', 'MEMBER']);
  });
});

describe('EventStatus enum', () => {
  it('should have exactly DRAFT, PUBLISHED', () => {
    expect(Object.values(EventStatus)).toEqual(['DRAFT', 'PUBLISHED']);
  });
});

describe('ParticipationStatus enum', () => {
  it('should have exactly GOING, MAYBE, NOT_GOING', () => {
    expect(Object.values(ParticipationStatus)).toEqual([
      'GOING',
      'MAYBE',
      'NOT_GOING',
    ]);
  });
});

describe('VaccineStatus enum', () => {
  it('should have exactly UP_TO_DATE, EXPIRING_SOON, EXPIRED', () => {
    expect(Object.values(VaccineStatus)).toEqual([
      'UP_TO_DATE',
      'EXPIRING_SOON',
      'EXPIRED',
    ]);
  });
});

describe('PaymentStatus enum', () => {
  it('should have exactly PENDING, COMPLETED, FAILED, REFUNDED', () => {
    expect(Object.values(PaymentStatus)).toEqual([
      'PENDING',
      'COMPLETED',
      'FAILED',
      'REFUNDED',
    ]);
  });
});

describe('DocumentType enum', () => {
  it('should have exactly VACCINE_CERTIFICATE, REGISTRATION_FORM, HEALTH_RECORD, LICENSE, OTHER', () => {
    expect(Object.values(DocumentType)).toEqual([
      'VACCINE_CERTIFICATE',
      'REGISTRATION_FORM',
      'HEALTH_RECORD',
      'LICENSE',
      'OTHER',
    ]);
  });
});
