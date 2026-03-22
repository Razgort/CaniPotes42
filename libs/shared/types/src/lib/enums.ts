export enum Role {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
}

export enum MemberStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export enum EventStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
}

export enum ParticipationStatus {
  GOING = 'GOING',
  MAYBE = 'MAYBE',
  NOT_GOING = 'NOT_GOING',
}

export enum VaccineStatus {
  UP_TO_DATE = 'UP_TO_DATE',
  EXPIRING_SOON = 'EXPIRING_SOON',
  EXPIRED = 'EXPIRED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export enum PaymentProvider {
  STRIPE = 'STRIPE',
  HELLOASSO = 'HELLOASSO',
}

export enum DocumentType {
  VACCINE_CERTIFICATE = 'VACCINE_CERTIFICATE',
  REGISTRATION_FORM = 'REGISTRATION_FORM',
  HEALTH_RECORD = 'HEALTH_RECORD',
  LICENSE = 'LICENSE',
  OTHER = 'OTHER',
}
