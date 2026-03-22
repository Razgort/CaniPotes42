import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { LicenseService } from './license.service.js';

describe('LicenseService', () => {
  let service: LicenseService;
  let prisma: {
    licenseType: {
      findMany: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
  };

  const clubId = 'club-uuid-1';
  const othercClubId = 'club-uuid-2';
  const licenseId = 'license-uuid-1';

  const mockLicenseType = {
    id: licenseId,
    clubId,
    name: 'Licence annuelle',
    amount: 50,
    season: '2025-2026',
    paymentProvider: 'STRIPE',
    deletedAt: null,
    createdAt: new Date('2026-03-22T00:00:00Z'),
    updatedAt: new Date('2026-03-22T00:00:00Z'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = {
      licenseType: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
    };
    service = new LicenseService(prisma as never);
  });

  describe('findAll', () => {
    it('should return only non-deleted license types for the club', async () => {
      prisma.licenseType.findMany.mockResolvedValue([mockLicenseType]);

      const result = await service.findAll(clubId);

      expect(prisma.licenseType.findMany).toHaveBeenCalledWith({
        where: { clubId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(licenseId);
    });

    it('should scope query to clubId (tenant isolation)', async () => {
      prisma.licenseType.findMany.mockResolvedValue([]);

      await service.findAll(othercClubId);

      expect(prisma.licenseType.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ clubId: othercClubId }) }),
      );
    });

    it('should filter out soft-deleted records', async () => {
      prisma.licenseType.findMany.mockResolvedValue([]);

      await service.findAll(clubId);

      expect(prisma.licenseType.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ deletedAt: null }) }),
      );
    });
  });

  describe('findOneOrThrow', () => {
    it('should return license type when found', async () => {
      prisma.licenseType.findFirst.mockResolvedValue(mockLicenseType);

      const result = await service.findOneOrThrow(licenseId, clubId);

      expect(result).toEqual(mockLicenseType);
      expect(prisma.licenseType.findFirst).toHaveBeenCalledWith({
        where: { id: licenseId, clubId, deletedAt: null },
      });
    });

    it('should throw NotFoundException when not found in this club', async () => {
      prisma.licenseType.findFirst.mockResolvedValue(null);

      await expect(service.findOneOrThrow(licenseId, othercClubId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException for soft-deleted record', async () => {
      prisma.licenseType.findFirst.mockResolvedValue(null);

      await expect(service.findOneOrThrow(licenseId, clubId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create license type with clubId and all required fields', async () => {
      prisma.licenseType.create.mockResolvedValue(mockLicenseType);

      const dto = {
        name: 'Licence annuelle',
        amount: 50,
        season: '2025-2026',
        paymentProvider: 'STRIPE' as const,
      };

      const result = await service.create(clubId, dto);

      expect(prisma.licenseType.create).toHaveBeenCalledWith({
        data: {
          clubId,
          name: dto.name,
          amount: dto.amount,
          season: dto.season,
          paymentProvider: dto.paymentProvider,
        },
      });
      expect(result.id).toBe(licenseId);
    });

    it('should create with HELLOASSO provider', async () => {
      const helloassoLicense = { ...mockLicenseType, paymentProvider: 'HELLOASSO' };
      prisma.licenseType.create.mockResolvedValue(helloassoLicense);

      const dto = {
        name: 'Pass journée',
        amount: 10,
        season: '2025-2026',
        paymentProvider: 'HELLOASSO' as const,
      };

      const result = await service.create(clubId, dto);

      expect(result.paymentProvider).toBe('HELLOASSO');
    });
  });

  describe('update', () => {
    it('should update license type when found', async () => {
      prisma.licenseType.findFirst.mockResolvedValue(mockLicenseType);
      const updated = { ...mockLicenseType, name: 'Nouveau nom' };
      prisma.licenseType.update.mockResolvedValue(updated);

      const result = await service.update(licenseId, clubId, { name: 'Nouveau nom' });

      expect(result.name).toBe('Nouveau nom');
      expect(prisma.licenseType.update).toHaveBeenCalledWith({
        where: { id: licenseId },
        data: { name: 'Nouveau nom' },
      });
    });

    it('should throw NotFoundException when license not found', async () => {
      prisma.licenseType.findFirst.mockResolvedValue(null);

      await expect(service.update(licenseId, clubId, { name: 'Test' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should only include defined fields in update', async () => {
      prisma.licenseType.findFirst.mockResolvedValue(mockLicenseType);
      prisma.licenseType.update.mockResolvedValue(mockLicenseType);

      await service.update(licenseId, clubId, { amount: 60 });

      expect(prisma.licenseType.update).toHaveBeenCalledWith({
        where: { id: licenseId },
        data: { amount: 60 },
      });
    });
  });

  describe('softDelete', () => {
    it('should set deletedAt timestamp (not hard-delete)', async () => {
      prisma.licenseType.findFirst.mockResolvedValue(mockLicenseType);
      prisma.licenseType.update.mockResolvedValue({
        ...mockLicenseType,
        deletedAt: new Date(),
      });

      const result = await service.softDelete(licenseId, clubId);

      expect(result).toEqual({ deleted: true });
      expect(prisma.licenseType.update).toHaveBeenCalledWith({
        where: { id: licenseId },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('should throw NotFoundException when license not found', async () => {
      prisma.licenseType.findFirst.mockResolvedValue(null);

      await expect(service.softDelete(licenseId, clubId)).rejects.toThrow(NotFoundException);
    });

    it('should prevent cross-club deletion', async () => {
      prisma.licenseType.findFirst.mockResolvedValue(null);

      await expect(service.softDelete(licenseId, othercClubId)).rejects.toThrow(NotFoundException);
    });
  });
});
