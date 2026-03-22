import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConflictException } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import type { RegisterWithConsent } from './dto/register.dto.js';
import * as bcrypt from 'bcrypt';

vi.mock('bcrypt', () => ({
  hash: vi.fn().mockResolvedValue('$2b$10$hashedpassword'),
}));

function createMockPrisma() {
  const txUser = { create: vi.fn() };
  const txConsent = { createMany: vi.fn() };
  const tx = { user: txUser, consent: txConsent };

  return {
    user: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn((fn: (tx: typeof tx) => Promise<unknown>) => fn(tx)),
    _tx: tx,
  };
}

describe('AuthService', () => {
  let service: AuthService;
  let prisma: ReturnType<typeof createMockPrisma>;

  const validDto: RegisterWithConsent = {
    email: 'test@example.com',
    password: 'password123',
    acceptPrivacyNotice: true as const,
    acceptOptionalData: false,
  };

  const createdUser = {
    id: 'uuid-123',
    email: 'test@example.com',
    passwordHash: '$2b$10$hashedpassword',
    firstName: '',
    lastName: '',
    avatarUrl: null,
    createdAt: new Date('2026-03-22T10:00:00Z'),
    updatedAt: new Date('2026-03-22T10:00:00Z'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = createMockPrisma();
    service = new AuthService(prisma as never);
  });

  it('should create User and Consent records on successful registration', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma._tx.user.create.mockResolvedValue(createdUser);
    prisma._tx.consent.createMany.mockResolvedValue({ count: 2 });

    const result = await service.register(validDto);

    expect(result).toEqual({
      id: 'uuid-123',
      email: 'test@example.com',
      createdAt: createdUser.createdAt,
    });
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'test@example.com' },
    });
    expect(prisma._tx.user.create).toHaveBeenCalledWith({
      data: {
        email: 'test@example.com',
        passwordHash: '$2b$10$hashedpassword',
        firstName: '',
        lastName: '',
      },
    });
  });

  it('should throw ConflictException for duplicate email', async () => {
    prisma.user.findUnique.mockResolvedValue(createdUser);

    await expect(service.register(validDto)).rejects.toThrow(ConflictException);
  });

  it('should hash password with bcrypt (never store plaintext)', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma._tx.user.create.mockResolvedValue(createdUser);
    prisma._tx.consent.createMany.mockResolvedValue({ count: 2 });

    await service.register(validDto);

    expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
    expect(prisma._tx.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          passwordHash: '$2b$10$hashedpassword',
        }),
      })
    );
  });

  it('should create consent records with correct types', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma._tx.user.create.mockResolvedValue(createdUser);
    prisma._tx.consent.createMany.mockResolvedValue({ count: 2 });

    await service.register(validDto);

    expect(prisma._tx.consent.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          userId: 'uuid-123',
          consentType: 'privacy_notice',
          granted: true,
        }),
        expect.objectContaining({
          userId: 'uuid-123',
          consentType: 'optional_data',
          granted: false,
        }),
      ]),
    });
  });

  it('should record optional data consent as true when accepted', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma._tx.user.create.mockResolvedValue(createdUser);
    prisma._tx.consent.createMany.mockResolvedValue({ count: 2 });

    await service.register({ ...validDto, acceptOptionalData: true });

    expect(prisma._tx.consent.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          consentType: 'optional_data',
          granted: true,
        }),
      ]),
    });
  });

  it('should never return passwordHash in response', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma._tx.user.create.mockResolvedValue(createdUser);
    prisma._tx.consent.createMany.mockResolvedValue({ count: 2 });

    const result = await service.register(validDto);

    expect(result).not.toHaveProperty('passwordHash');
    expect(result).toEqual({
      id: expect.any(String),
      email: expect.any(String),
      createdAt: expect.any(Date),
    });
  });
});
