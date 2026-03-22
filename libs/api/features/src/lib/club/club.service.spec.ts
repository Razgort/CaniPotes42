import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { ClubService } from './club.service.js';
import type { CreateClub } from '@org/types';
import type { JwtPayload } from '@org/api-core';

describe('ClubService', () => {
  let service: ClubService;
  let prisma: {
    $transaction: ReturnType<typeof vi.fn>;
    club: {
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
  };
  let jwtService: { sign: ReturnType<typeof vi.fn> };

  const mockUser: JwtPayload = {
    sub: 'user-uuid-1',
    email: 'aude@example.com',
    activeClubId: null as any,
    role: null as any,
  };

  const mockDto: CreateClub = {
    name: "Cani'potes 42",
    federation: 'FFSLC',
    contactEmail: 'contact@canipotes42.fr',
    description: 'Club de cani-cross de la Loire',
  };

  const mockClub = {
    id: 'club-uuid-1',
    name: mockDto.name,
    federationType: mockDto.federation,
    logo: null,
    contactEmail: mockDto.contactEmail,
    description: mockDto.description,
    createdAt: new Date('2026-03-22T00:00:00Z'),
    updatedAt: new Date('2026-03-22T00:00:00Z'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = {
      $transaction: vi.fn(),
      club: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
    };

    jwtService = {
      sign: vi.fn(),
    };

    service = new ClubService(prisma as never, jwtService as never);
  });

  describe('createClub', () => {
    it('should create club and member in a transaction', async () => {
      prisma.$transaction.mockImplementation(async (fn: any) => {
        const tx = {
          club: { create: vi.fn().mockResolvedValue(mockClub) },
          clubMember: { create: vi.fn().mockResolvedValue({}) },
          chatChannel: { create: vi.fn().mockResolvedValue({}) },
        };
        return fn(tx);
      });
      jwtService.sign.mockReturnValue('mock-access-token');

      const result = await service.createClub(mockDto, mockUser);

      expect(prisma.$transaction).toHaveBeenCalledOnce();
      expect(result.club.id).toBe('club-uuid-1');
      expect(result.club.name).toBe("Cani'potes 42");
      expect(result.accessToken).toBe('mock-access-token');
    });

    it('should generate JWT with new activeClubId and OWNER role', async () => {
      prisma.$transaction.mockImplementation(async (fn: any) => {
        const tx = {
          club: { create: vi.fn().mockResolvedValue(mockClub) },
          clubMember: { create: vi.fn().mockResolvedValue({}) },
          chatChannel: { create: vi.fn().mockResolvedValue({}) },
        };
        return fn(tx);
      });
      jwtService.sign.mockReturnValue('mock-token');

      await service.createClub(mockDto, mockUser);

      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: 'user-uuid-1',
        email: 'aude@example.com',
        activeClubId: 'club-uuid-1',
        role: 'OWNER',
      });
    });

    it('should create ClubMember with OWNER role', async () => {
      const memberCreate = vi.fn().mockResolvedValue({});
      prisma.$transaction.mockImplementation(async (fn: any) => {
        const tx = {
          club: { create: vi.fn().mockResolvedValue(mockClub) },
          clubMember: { create: memberCreate },
          chatChannel: { create: vi.fn().mockResolvedValue({}) },
        };
        return fn(tx);
      });
      jwtService.sign.mockReturnValue('mock-token');

      await service.createClub(mockDto, mockUser);

      expect(memberCreate).toHaveBeenCalledWith({
        data: {
          userId: 'user-uuid-1',
          clubId: 'club-uuid-1',
          role: 'OWNER',
        },
      });
    });

    it('should set logo to null when not provided', async () => {
      const clubCreate = vi.fn().mockResolvedValue(mockClub);
      prisma.$transaction.mockImplementation(async (fn: any) => {
        const tx = {
          club: { create: clubCreate },
          clubMember: { create: vi.fn().mockResolvedValue({}) },
          chatChannel: { create: vi.fn().mockResolvedValue({}) },
        };
        return fn(tx);
      });
      jwtService.sign.mockReturnValue('mock-token');

      await service.createClub(mockDto, mockUser);

      expect(clubCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({ logo: null }),
      });
    });

    it('should include logo URL when provided', async () => {
      const dtoWithLogo = { ...mockDto, logo: 'https://r2.example.com/logo.png' };
      const clubWithLogo = { ...mockClub, logo: 'https://r2.example.com/logo.png' };
      const clubCreate = vi.fn().mockResolvedValue(clubWithLogo);
      prisma.$transaction.mockImplementation(async (fn: any) => {
        const tx = {
          club: { create: clubCreate },
          clubMember: { create: vi.fn().mockResolvedValue({}) },
          chatChannel: { create: vi.fn().mockResolvedValue({}) },
        };
        return fn(tx);
      });
      jwtService.sign.mockReturnValue('mock-token');

      const result = await service.createClub(dtoWithLogo, mockUser);

      expect(clubCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({ logo: 'https://r2.example.com/logo.png' }),
      });
      expect(result.club.logo).toBe('https://r2.example.com/logo.png');
    });

    it('should generate a refresh token', async () => {
      prisma.$transaction.mockImplementation(async (fn: any) => {
        const tx = {
          club: { create: vi.fn().mockResolvedValue(mockClub) },
          clubMember: { create: vi.fn().mockResolvedValue({}) },
          chatChannel: { create: vi.fn().mockResolvedValue({}) },
        };
        return fn(tx);
      });
      jwtService.sign.mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token');

      const result = await service.createClub(mockDto, mockUser);

      expect(result.refreshToken).toBe('refresh-token');
      expect(jwtService.sign).toHaveBeenCalledTimes(2);
    });
  });

  describe('findOne', () => {
    const prismaClub = {
      id: 'club-uuid-1',
      name: "Cani'potes 42",
      federationType: 'FFSLC',
      logo: null,
      contactEmail: 'contact@canipotes42.fr',
      description: 'Club de cani-cross',
    };

    it('should return mapped club data', async () => {
      prisma.club.findUnique.mockResolvedValue(prismaClub);

      const result = await service.findOne('club-uuid-1');

      expect(result).toEqual({
        id: 'club-uuid-1',
        name: "Cani'potes 42",
        federation: 'FFSLC',
        logo: null,
        contactEmail: 'contact@canipotes42.fr',
        description: 'Club de cani-cross',
      });
    });

    it('should map federationType to federation', async () => {
      prisma.club.findUnique.mockResolvedValue(prismaClub);

      const result = await service.findOne('club-uuid-1');

      expect(result.federation).toBe('FFSLC');
      expect(result).not.toHaveProperty('federationType');
    });

    it('should throw NotFoundException when club not found', async () => {
      prisma.club.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const existingClub = {
      id: 'club-uuid-1',
      name: "Cani'potes 42",
      federationType: 'FFSLC',
      logo: null,
      contactEmail: 'contact@canipotes42.fr',
      description: 'Club de cani-cross',
    };

    it('should update and return mapped club data', async () => {
      prisma.club.findUnique.mockResolvedValue(existingClub);
      const updatedClub = { ...existingClub, name: 'Nouveau Nom' };
      prisma.club.update.mockResolvedValue(updatedClub);

      const result = await service.update('club-uuid-1', { name: 'Nouveau Nom' });

      expect(result.name).toBe('Nouveau Nom');
      expect(result.federation).toBe('FFSLC');
    });

    it('should map federation to federationType in Prisma update', async () => {
      prisma.club.findUnique.mockResolvedValue(existingClub);
      prisma.club.update.mockResolvedValue({ ...existingClub, federationType: 'CNEAC' });

      await service.update('club-uuid-1', { federation: 'CNEAC' });

      expect(prisma.club.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { federationType: 'CNEAC' },
        }),
      );
    });

    it('should throw NotFoundException when club not found', async () => {
      prisma.club.findUnique.mockResolvedValue(null);

      await expect(service.update('nonexistent', { name: 'Test' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should only include defined fields in update', async () => {
      prisma.club.findUnique.mockResolvedValue(existingClub);
      prisma.club.update.mockResolvedValue(existingClub);

      await service.update('club-uuid-1', { name: 'Test' });

      expect(prisma.club.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { name: 'Test' },
        }),
      );
    });
  });

  describe('updateLogo', () => {
    it('should update club logo and return id + logo', async () => {
      prisma.club.update.mockResolvedValue({ id: 'club-1', logo: 'https://new-logo.com' });

      const result = await service.updateLogo('club-1', 'https://new-logo.com');

      expect(result).toEqual({ id: 'club-1', logo: 'https://new-logo.com' });
      expect(prisma.club.update).toHaveBeenCalledWith({
        where: { id: 'club-1' },
        data: { logo: 'https://new-logo.com' },
        select: { id: true, logo: true },
      });
    });
  });

  describe('getLogo', () => {
    it('should return logo URL when exists', async () => {
      prisma.club.findUnique.mockResolvedValue({ logo: 'https://logo.com/img.png' });

      const result = await service.getLogo('club-1');

      expect(result).toBe('https://logo.com/img.png');
    });

    it('should return null when no logo', async () => {
      prisma.club.findUnique.mockResolvedValue({ logo: null });

      const result = await service.getLogo('club-1');

      expect(result).toBeNull();
    });

    it('should return null when club not found', async () => {
      prisma.club.findUnique.mockResolvedValue(null);

      const result = await service.getLogo('nonexistent');

      expect(result).toBeNull();
    });
  });
});
