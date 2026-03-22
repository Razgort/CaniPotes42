import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { LicenseController } from './license.controller.js';
import { LicenseService } from './license.service.js';

function createMockLicenseService() {
  return {
    findAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
    findOneOrThrow: vi.fn(),
  };
}

describe('LicenseController', () => {
  let controller: LicenseController;
  let licenseService: ReturnType<typeof createMockLicenseService>;

  const clubId = 'club-uuid-1';
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
    licenseService = createMockLicenseService();
    controller = new LicenseController(licenseService as never);
  });

  describe('findAll', () => {
    it('should return wrapped data array', async () => {
      licenseService.findAll.mockResolvedValue([mockLicenseType]);

      const result = await controller.findAll(clubId);

      expect(result).toEqual({ data: [mockLicenseType] });
      expect(licenseService.findAll).toHaveBeenCalledWith(clubId);
    });

    it('should return empty array when no license types', async () => {
      licenseService.findAll.mockResolvedValue([]);

      const result = await controller.findAll(clubId);

      expect(result).toEqual({ data: [] });
    });
  });

  describe('create', () => {
    it('should return created license type wrapped in data', async () => {
      licenseService.create.mockResolvedValue(mockLicenseType);

      const dto = {
        name: 'Licence annuelle',
        amount: 50,
        season: '2025-2026',
        paymentProvider: 'STRIPE' as const,
      };

      const result = await controller.create(clubId, dto);

      expect(result).toEqual({ data: mockLicenseType });
      expect(licenseService.create).toHaveBeenCalledWith(clubId, dto);
    });
  });

  describe('update', () => {
    it('should return updated license type wrapped in data', async () => {
      const updated = { ...mockLicenseType, name: 'Nouveau nom' };
      licenseService.update.mockResolvedValue(updated);

      const result = await controller.update(clubId, licenseId, { name: 'Nouveau nom' });

      expect(result).toEqual({ data: updated });
      expect(licenseService.update).toHaveBeenCalledWith(licenseId, clubId, { name: 'Nouveau nom' });
    });

    it('should propagate NotFoundException from service', async () => {
      licenseService.update.mockRejectedValue(new NotFoundException());

      await expect(controller.update(clubId, licenseId, { name: 'Test' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should return deleted:true on soft-delete', async () => {
      licenseService.softDelete.mockResolvedValue({ deleted: true });

      const result = await controller.remove(clubId, licenseId);

      expect(result).toEqual({ data: { deleted: true } });
      expect(licenseService.softDelete).toHaveBeenCalledWith(licenseId, clubId);
    });

    it('should propagate NotFoundException when license not found', async () => {
      licenseService.softDelete.mockRejectedValue(new NotFoundException());

      await expect(controller.remove(clubId, 'nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
