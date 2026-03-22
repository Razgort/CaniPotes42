import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { VaccineController } from './vaccine.controller.js';
import { VaccineService } from './vaccine.service.js';
import { R2Service } from '../document/r2.service.js';
import { VaccineStatus } from '@org/types';

function makeMockVaccineService() {
  return {
    listVaccines: vi.fn(),
    createVaccine: vi.fn(),
    updateVaccine: vi.fn(),
    deleteVaccine: vi.fn(),
    uploadCertificate: vi.fn(),
    deleteCertificate: vi.fn(),
  };
}

function makeMockR2Service() {
  return {
    upload: vi.fn(),
    delete: vi.fn(),
    getSignedUrl: vi.fn(),
  };
}

describe('VaccineController', () => {
  let controller: VaccineController;
  let vaccineService: ReturnType<typeof makeMockVaccineService>;
  let r2Service: ReturnType<typeof makeMockR2Service>;

  const clubId = 'club-1';
  const userId = 'user-1';
  const dogId = 'dog-1';
  const vaccineId = 'vaccine-1';

  const mockUser = { sub: userId, email: 'test@test.com', activeClubId: clubId, role: 'MEMBER' as const };

  const mockVaccineResult = {
    id: vaccineId,
    dogId,
    vaccineName: 'Rage',
    dateAdministered: new Date('2025-03-01'),
    expiryDate: new Date('2027-03-01'),
    certificateUrl: null,
    status: VaccineStatus.UP_TO_DATE,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vaccineService = makeMockVaccineService();
    r2Service = makeMockR2Service();
    controller = new VaccineController(
      vaccineService as unknown as VaccineService,
      r2Service as unknown as R2Service,
    );
  });

  describe('list', () => {
    it('returns vaccines for a dog', async () => {
      vaccineService.listVaccines.mockResolvedValue([mockVaccineResult]);
      const result = await controller.list(dogId, clubId);
      expect(result).toHaveLength(1);
      expect(vaccineService.listVaccines).toHaveBeenCalledWith(dogId, clubId);
    });
  });

  describe('create', () => {
    const dto = {
      vaccineName: 'Rage',
      dateAdministered: '2025-03-01',
      expiryDate: '2027-03-01',
    };

    it('creates a vaccine record', async () => {
      vaccineService.createVaccine.mockResolvedValue(mockVaccineResult);
      const result = await controller.create(dogId, clubId, mockUser, dto);
      expect(result.id).toBe(vaccineId);
      expect(vaccineService.createVaccine).toHaveBeenCalledWith(dogId, clubId, userId, dto);
    });

    it('propagates ForbiddenException from service', async () => {
      vaccineService.createVaccine.mockRejectedValue(
        new ForbiddenException('Only the dog owner can add vaccine records'),
      );
      await expect(controller.create(dogId, clubId, mockUser, dto)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('update', () => {
    it('updates a vaccine record', async () => {
      vaccineService.updateVaccine.mockResolvedValue({ ...mockVaccineResult, vaccineName: 'DHPP' });
      const result = await controller.update(dogId, vaccineId, clubId, mockUser, { vaccineName: 'DHPP' });
      expect(result.vaccineName).toBe('DHPP');
    });
  });

  describe('delete', () => {
    it('deletes a vaccine record', async () => {
      vaccineService.deleteVaccine.mockResolvedValue({ message: 'Vaccine record deleted' });
      const result = await controller.delete(dogId, vaccineId, clubId, mockUser);
      expect(result).toEqual({ message: 'Vaccine record deleted' });
    });
  });

  describe('uploadCertificate', () => {
    const mockFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'cert.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      buffer: Buffer.from('test'),
      size: 1024,
      stream: null as any,
      destination: '',
      filename: '',
      path: '',
    };

    it('uploads certificate and updates vaccine record', async () => {
      const url = 'https://r2.example.com/cert.jpg';
      r2Service.upload.mockResolvedValue(url);
      vaccineService.uploadCertificate.mockResolvedValue({ ...mockVaccineResult, certificateUrl: url });

      const result = await controller.uploadCertificate(dogId, vaccineId, clubId, mockUser, mockFile);

      expect(r2Service.upload).toHaveBeenCalledWith(
        `clubs/${clubId}/dogs/${dogId}/vaccines/${vaccineId}/certificate.jpg`,
        mockFile.buffer,
        mockFile.mimetype,
      );
      expect(result.certificateUrl).toBe(url);
    });

    it('throws BadRequestException when no file provided', async () => {
      await expect(
        controller.uploadCertificate(dogId, vaccineId, clubId, mockUser, undefined as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException for invalid MIME type', async () => {
      const badFile = { ...mockFile, mimetype: 'application/pdf' };
      await expect(
        controller.uploadCertificate(dogId, vaccineId, clubId, mockUser, badFile as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when file exceeds 5MB', async () => {
      const bigFile = { ...mockFile, size: 6 * 1024 * 1024 };
      await expect(
        controller.uploadCertificate(dogId, vaccineId, clubId, mockUser, bigFile as any),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
