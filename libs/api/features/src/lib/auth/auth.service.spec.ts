import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConflictException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import type { RegisterWithConsent } from './dto/register.dto.js';
import * as bcrypt from 'bcrypt';

vi.mock('bcrypt', () => ({
  hash: vi.fn().mockResolvedValue('$2b$10$hashedpassword'),
  compare: vi.fn(),
}));

interface MockTx {
  user: { create: ReturnType<typeof vi.fn> };
  consent: { createMany: ReturnType<typeof vi.fn> };
}

function createMockPrisma() {
  const tx: MockTx = {
    user: { create: vi.fn() },
    consent: { createMany: vi.fn() },
  };

  return {
    user: {
      findUnique: vi.fn(),
    },
    clubMember: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    $transaction: vi.fn((fn: (tx: MockTx) => Promise<unknown>) => fn(tx)),
    _tx: tx,
  };
}

function createMockJwtService() {
  return {
    sign: vi.fn().mockReturnValue('mock-jwt-token'),
    verify: vi.fn(),
  };
}

describe('AuthService', () => {
  let service: AuthService;
  let prisma: ReturnType<typeof createMockPrisma>;
  let jwtService: ReturnType<typeof createMockJwtService>;

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
    jwtService = createMockJwtService();
    service = new AuthService(prisma as never, jwtService as never);
  });

  // --- Registration tests ---

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

  // --- Login tests ---

  describe('login', () => {
    const loginDto = { email: 'test@example.com', password: 'password123' };

    const existingUser = {
      id: 'uuid-123',
      email: 'test@example.com',
      passwordHash: '$2b$10$hashedpassword',
      firstName: 'Jean',
      lastName: 'Dupont',
      avatarUrl: null,
      createdAt: new Date('2026-03-22T10:00:00Z'),
      updatedAt: new Date('2026-03-22T10:00:00Z'),
    };

    const singleMembership = [
      {
        id: 'member-1',
        userId: 'uuid-123',
        clubId: 'club-1',
        role: 'OWNER',
        createdAt: new Date(),
        club: { id: 'club-1', name: 'Club Canin' },
      },
    ];

    it('should return accessToken, user, and activeClub on valid login with one club', async () => {
      prisma.user.findUnique.mockResolvedValue(existingUser);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      prisma.clubMember.findMany.mockResolvedValue(singleMembership);
      jwtService.sign
        .mockReturnValueOnce('access-token-123')
        .mockReturnValueOnce('refresh-token-456');

      const result = await service.login(loginDto);

      expect(result.accessToken).toBe('access-token-123');
      expect(result.refreshToken).toBe('refresh-token-456');
      expect(result.user).toEqual({
        id: 'uuid-123',
        email: 'test@example.com',
        firstName: 'Jean',
        lastName: 'Dupont',
        avatarUrl: null,
      });
      expect(result.activeClub).toEqual({
        id: 'club-1',
        name: 'Club Canin',
        role: 'OWNER',
      });
    });

    it('should sign access token with correct payload', async () => {
      prisma.user.findUnique.mockResolvedValue(existingUser);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      prisma.clubMember.findMany.mockResolvedValue(singleMembership);

      await service.login(loginDto);

      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: 'uuid-123',
        email: 'test@example.com',
        activeClubId: 'club-1',
        role: 'OWNER',
      });
    });

    it('should sign refresh token with only sub and use refresh secret', async () => {
      prisma.user.findUnique.mockResolvedValue(existingUser);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      prisma.clubMember.findMany.mockResolvedValue(singleMembership);

      await service.login(loginDto);

      expect(jwtService.sign).toHaveBeenCalledWith(
        { sub: 'uuid-123' },
        expect.objectContaining({
          secret: process.env['JWT_REFRESH_SECRET'],
          expiresIn: '7d',
        }),
      );
    });

    it('should throw UnauthorizedException for non-existent email', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      prisma.user.findUnique.mockResolvedValue(existingUser);
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      expect(prisma.clubMember.findMany).not.toHaveBeenCalled();
    });

    it('should return same error for wrong email and wrong password (no info leakage)', async () => {
      // Wrong email
      prisma.user.findUnique.mockResolvedValue(null);
      try {
        await service.login(loginDto);
      } catch (e) {
        expect((e as UnauthorizedException).getResponse()).toEqual(
          expect.objectContaining({ error: 'INVALID_CREDENTIALS' }),
        );
      }

      // Wrong password
      prisma.user.findUnique.mockResolvedValue(existingUser);
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);
      try {
        await service.login(loginDto);
      } catch (e) {
        expect((e as UnauthorizedException).getResponse()).toEqual(
          expect.objectContaining({ error: 'INVALID_CREDENTIALS' }),
        );
      }
    });

    it('should return null activeClub when user has no club memberships', async () => {
      prisma.user.findUnique.mockResolvedValue(existingUser);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      prisma.clubMember.findMany.mockResolvedValue([]);

      const result = await service.login(loginDto);

      expect(result.activeClub).toBeNull();
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          activeClubId: null,
          role: null,
        }),
      );
    });

    it('should select first club for multi-club user', async () => {
      const multiMemberships = [
        {
          id: 'member-1',
          userId: 'uuid-123',
          clubId: 'club-1',
          role: 'OWNER',
          createdAt: new Date('2026-03-20'),
          club: { id: 'club-1', name: 'Club A' },
        },
        {
          id: 'member-2',
          userId: 'uuid-123',
          clubId: 'club-2',
          role: 'MEMBER',
          createdAt: new Date('2026-03-19'),
          club: { id: 'club-2', name: 'Club B' },
        },
      ];

      prisma.user.findUnique.mockResolvedValue(existingUser);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      prisma.clubMember.findMany.mockResolvedValue(multiMemberships);

      const result = await service.login(loginDto);

      expect(result.activeClub).toEqual({
        id: 'club-1',
        name: 'Club A',
        role: 'OWNER',
      });
    });

    it('should look up user by email case-insensitively', async () => {
      prisma.user.findUnique.mockResolvedValue(existingUser);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      prisma.clubMember.findMany.mockResolvedValue([]);

      await service.login({ email: 'TEST@EXAMPLE.COM', password: 'password123' });

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('should never return passwordHash in login response', async () => {
      prisma.user.findUnique.mockResolvedValue(existingUser);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      prisma.clubMember.findMany.mockResolvedValue([]);

      const result = await service.login(loginDto);

      expect(result.user).not.toHaveProperty('passwordHash');
    });
  });

  // --- Token Refresh tests ---

  describe('refreshTokens', () => {
    const refreshUser = {
      id: 'uuid-123',
      email: 'test@example.com',
      passwordHash: '$2b$10$hashedpassword',
      firstName: 'Jean',
      lastName: 'Dupont',
      avatarUrl: null,
      createdAt: new Date('2026-03-22T10:00:00Z'),
      updatedAt: new Date('2026-03-22T10:00:00Z'),
    };

    it('should return new access and refresh tokens for valid refresh token', async () => {
      jwtService.verify.mockReturnValue({ sub: 'uuid-123' });
      jwtService.sign
        .mockReturnValueOnce('new-access-token')
        .mockReturnValueOnce('new-refresh-token');

      prisma.user.findUnique.mockResolvedValue(refreshUser);
      prisma.clubMember.findMany.mockResolvedValue([
        { clubId: 'club-1', role: 'OWNER', createdAt: new Date() },
      ]);

      const result = await service.refreshTokens('valid-refresh-token');

      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBe('new-refresh-token');
    });

    it('should re-read club membership from DB on refresh', async () => {
      jwtService.verify.mockReturnValue({ sub: 'uuid-123' });
      jwtService.sign.mockReturnValue('token');

      prisma.user.findUnique.mockResolvedValue(refreshUser);
      prisma.clubMember.findMany.mockResolvedValue([
        { clubId: 'new-club', role: 'ADMIN', createdAt: new Date() },
      ]);

      await service.refreshTokens('valid-token');

      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: 'uuid-123',
          activeClubId: 'new-club',
          role: 'ADMIN',
        })
      );
    });

    it('should throw UnauthorizedException for expired refresh token', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('jwt expired');
      });

      await expect(service.refreshTokens('expired-token'))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('invalid signature');
      });

      await expect(service.refreshTokens('bad-token'))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user not found', async () => {
      jwtService.verify.mockReturnValue({ sub: 'nonexistent' });
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.refreshTokens('valid-token'))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should handle user with no club memberships', async () => {
      jwtService.verify.mockReturnValue({ sub: 'uuid-123' });
      jwtService.sign.mockReturnValue('token');

      prisma.user.findUnique.mockResolvedValue(refreshUser);
      prisma.clubMember.findMany.mockResolvedValue([]);

      await service.refreshTokens('valid-token');

      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          activeClubId: null,
          role: null,
        })
      );
    });
  });

  // --- Logout helper tests ---

  describe('getClearRefreshTokenCookieOptions', () => {
    it('should return cookie options with maxAge 0', () => {
      const options = service.getClearRefreshTokenCookieOptions();

      expect(options.maxAge).toBe(0);
      expect(options.httpOnly).toBe(true);
    });
  });

  // --- switchClub tests ---

  describe('switchClub', () => {
    const membershipWithClub = {
      id: 'member-1',
      userId: 'uuid-123',
      clubId: 'club-2',
      role: 'ADMIN',
      createdAt: new Date(),
      club: {
        id: 'club-2',
        name: 'Club Agility',
        logo: 'https://example.com/logo.png',
        federationType: 'FFSLC',
      },
    };

    it('should return new accessToken with correct activeClubId and role', async () => {
      prisma.clubMember.findFirst.mockResolvedValue(membershipWithClub);
      jwtService.sign.mockReturnValue('new-access-token');

      const result = await service.switchClub('uuid-123', 'test@example.com', 'club-2');

      expect(result.accessToken).toBe('new-access-token');
      expect(result.role).toBe('ADMIN');
      expect(result.activeClub).toEqual({
        id: 'club-2',
        name: 'Club Agility',
        logo: 'https://example.com/logo.png',
        federationType: 'FFSLC',
      });
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: 'uuid-123',
        email: 'test@example.com',
        activeClubId: 'club-2',
        role: 'ADMIN',
      });
    });

    it('should throw ForbiddenException when user is not a member of the club', async () => {
      prisma.clubMember.findFirst.mockResolvedValue(null);

      await expect(
        service.switchClub('uuid-123', 'test@example.com', 'non-member-club'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // --- getUserClubs tests ---

  describe('getUserClubs', () => {
    it('should return all clubs with role for user, ordered by club name', async () => {
      const memberships = [
        {
          id: 'member-1',
          userId: 'uuid-123',
          clubId: 'club-1',
          role: 'OWNER',
          createdAt: new Date(),
          club: { id: 'club-1', name: 'Alpha Club', logo: null, federationType: 'CNEAC' },
        },
        {
          id: 'member-2',
          userId: 'uuid-123',
          clubId: 'club-2',
          role: 'MEMBER',
          createdAt: new Date(),
          club: { id: 'club-2', name: 'Beta Club', logo: 'logo.png', federationType: 'FFSLC' },
        },
      ];

      prisma.clubMember.findMany.mockResolvedValue(memberships);

      const result = await service.getUserClubs('uuid-123');

      expect(result).toEqual([
        { clubId: 'club-1', name: 'Alpha Club', logo: null, federationType: 'CNEAC', role: 'OWNER' },
        { clubId: 'club-2', name: 'Beta Club', logo: 'logo.png', federationType: 'FFSLC', role: 'MEMBER' },
      ]);

      expect(prisma.clubMember.findMany).toHaveBeenCalledWith({
        where: { userId: 'uuid-123' },
        include: {
          club: { select: { id: true, name: true, logo: true, federationType: true } },
        },
        orderBy: { club: { name: 'asc' } },
      });
    });

    it('should return empty array when user has no clubs', async () => {
      prisma.clubMember.findMany.mockResolvedValue([]);

      const result = await service.getUserClubs('uuid-123');

      expect(result).toEqual([]);
    });
  });
});
