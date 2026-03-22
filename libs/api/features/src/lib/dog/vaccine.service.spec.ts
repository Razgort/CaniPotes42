import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { VaccineService } from './vaccine.service.js';
import { calculateVaccineStatus, calculateDogOverallStatus } from './vaccine-status.util.js';
import { VaccineStatus } from '@org/types';

// --- Status utility tests ---

describe('calculateVaccineStatus', () => {
  const now = new Date('2026-03-22T12:00:00Z');

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns UP_TO_DATE when expiryDate is null', () => {
    expect(calculateVaccineStatus(null)).toBe(VaccineStatus.UP_TO_DATE);
  });

  it('returns EXPIRED when expiryDate is yesterday', () => {
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    expect(calculateVaccineStatus(yesterday)).toBe(VaccineStatus.EXPIRED);
  });

  it('returns EXPIRING_SOON when expiryDate is exactly now (not yet past)', () => {
    // AC: "Expiré if expiryDate < today" — equal is not less-than, so EXPIRING_SOON
    expect(calculateVaccineStatus(now)).toBe(VaccineStatus.EXPIRING_SOON);
  });

  it('returns EXPIRING_SOON when expiryDate is exactly 30 days from now', () => {
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    expect(calculateVaccineStatus(thirtyDays)).toBe(VaccineStatus.EXPIRING_SOON);
  });

  it('returns EXPIRING_SOON when expiryDate is 1 day from now', () => {
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    expect(calculateVaccineStatus(tomorrow)).toBe(VaccineStatus.EXPIRING_SOON);
  });

  it('returns UP_TO_DATE when expiryDate is 31 days from now', () => {
    const thirtyOneDays = new Date(now.getTime() + 31 * 24 * 60 * 60 * 1000);
    expect(calculateVaccineStatus(thirtyOneDays)).toBe(VaccineStatus.UP_TO_DATE);
  });

  it('returns UP_TO_DATE when expiryDate is far in the future', () => {
    const future = new Date('2030-01-01');
    expect(calculateVaccineStatus(future)).toBe(VaccineStatus.UP_TO_DATE);
  });
});

describe('calculateDogOverallStatus', () => {
  const now = new Date('2026-03-22T12:00:00Z');

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns UP_TO_DATE for empty vaccine list', () => {
    expect(calculateDogOverallStatus([])).toBe(VaccineStatus.UP_TO_DATE);
  });

  it('returns EXPIRED when any vaccine is expired (worst-status wins)', () => {
    const vaccines = [
      { expiryDate: new Date('2030-01-01') }, // UP_TO_DATE
      { expiryDate: new Date('2026-03-21') }, // EXPIRED
      { expiryDate: new Date('2026-04-01') }, // EXPIRING_SOON
    ];
    expect(calculateDogOverallStatus(vaccines)).toBe(VaccineStatus.EXPIRED);
  });

  it('returns EXPIRING_SOON when no expired but some expiring', () => {
    const vaccines = [
      { expiryDate: new Date('2030-01-01') }, // UP_TO_DATE
      { expiryDate: new Date('2026-04-01') }, // EXPIRING_SOON
    ];
    expect(calculateDogOverallStatus(vaccines)).toBe(VaccineStatus.EXPIRING_SOON);
  });

  it('returns UP_TO_DATE when all vaccines are up to date', () => {
    const vaccines = [
      { expiryDate: new Date('2030-01-01') },
      { expiryDate: new Date('2028-06-15') },
    ];
    expect(calculateDogOverallStatus(vaccines)).toBe(VaccineStatus.UP_TO_DATE);
  });
});

// --- VaccineService unit tests ---

function makeMockPrisma() {
  return {
    dog: {
      findFirst: vi.fn(),
    },
    vaccineRecord: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };
}

describe('VaccineService', () => {
  let service: VaccineService;
  let prisma: ReturnType<typeof makeMockPrisma>;

  const clubId = 'club-1';
  const userId = 'user-1';
  const dogId = 'dog-1';
  const vaccineId = 'vaccine-1';

  const mockDog = { id: dogId, userId, clubId };

  const mockVaccine = {
    id: vaccineId,
    dogId,
    vaccineName: 'Rage',
    dateAdministered: new Date('2025-03-01'),
    expiryDate: new Date('2027-03-01'),
    certificateUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    prisma = makeMockPrisma();
    service = new VaccineService(prisma as any);
  });

  describe('listVaccines', () => {
    it('returns vaccines with computed status', async () => {
      prisma.dog.findFirst.mockResolvedValue(mockDog);
      prisma.vaccineRecord.findMany.mockResolvedValue([mockVaccine]);

      const result = await service.listVaccines(dogId, clubId);

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(VaccineStatus.UP_TO_DATE);
    });

    it('throws NotFoundException when dog not in club', async () => {
      prisma.dog.findFirst.mockResolvedValue(null);
      await expect(service.listVaccines(dogId, clubId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('createVaccine', () => {
    const dto = {
      vaccineName: 'Rage',
      dateAdministered: '2025-03-01',
      expiryDate: '2027-03-01',
    };

    it('creates and returns vaccine with status', async () => {
      prisma.dog.findFirst.mockResolvedValue(mockDog);
      prisma.vaccineRecord.create.mockResolvedValue(mockVaccine);

      const result = await service.createVaccine(dogId, clubId, userId, dto);

      expect(result.status).toBe(VaccineStatus.UP_TO_DATE);
      expect(prisma.vaccineRecord.create).toHaveBeenCalledWith({
        data: {
          dogId,
          vaccineName: 'Rage',
          dateAdministered: new Date('2025-03-01'),
          expiryDate: new Date('2027-03-01'),
        },
      });
    });

    it('throws ForbiddenException when user is not dog owner', async () => {
      prisma.dog.findFirst.mockResolvedValue({ ...mockDog, userId: 'other-user' });
      await expect(service.createVaccine(dogId, clubId, userId, dto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws NotFoundException when dog not found', async () => {
      prisma.dog.findFirst.mockResolvedValue(null);
      await expect(service.createVaccine(dogId, clubId, userId, dto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateVaccine', () => {
    it('updates and returns vaccine with recalculated status', async () => {
      const expiredDate = new Date('2020-01-01');
      const updatedVaccine = { ...mockVaccine, expiryDate: expiredDate };

      prisma.dog.findFirst.mockResolvedValue(mockDog);
      prisma.vaccineRecord.findFirst.mockResolvedValue(mockVaccine);
      prisma.vaccineRecord.update.mockResolvedValue(updatedVaccine);

      const result = await service.updateVaccine(dogId, vaccineId, clubId, userId, {
        expiryDate: '2020-01-01',
      });

      expect(result.status).toBe(VaccineStatus.EXPIRED);
    });

    it('throws ForbiddenException when user is not dog owner', async () => {
      prisma.dog.findFirst.mockResolvedValue({ ...mockDog, userId: 'other-user' });
      await expect(
        service.updateVaccine(dogId, vaccineId, clubId, userId, {}),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('deleteVaccine', () => {
    it('deletes vaccine successfully', async () => {
      prisma.dog.findFirst.mockResolvedValue(mockDog);
      prisma.vaccineRecord.findFirst.mockResolvedValue(mockVaccine);
      prisma.vaccineRecord.delete.mockResolvedValue(mockVaccine);

      const result = await service.deleteVaccine(dogId, vaccineId, clubId, userId);

      expect(result).toEqual({ message: 'Vaccine record deleted' });
      expect(prisma.vaccineRecord.delete).toHaveBeenCalledWith({ where: { id: vaccineId } });
    });

    it('throws ForbiddenException when not owner', async () => {
      prisma.dog.findFirst.mockResolvedValue({ ...mockDog, userId: 'other-user' });
      await expect(
        service.deleteVaccine(dogId, vaccineId, clubId, userId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('uploadCertificate', () => {
    it('saves certificateUrl on vaccine record', async () => {
      const url = 'https://r2.example.com/cert.jpg';
      const updatedVaccine = { ...mockVaccine, certificateUrl: url };

      prisma.dog.findFirst.mockResolvedValue(mockDog);
      prisma.vaccineRecord.findFirst.mockResolvedValue(mockVaccine);
      prisma.vaccineRecord.update.mockResolvedValue(updatedVaccine);

      const result = await service.uploadCertificate(dogId, vaccineId, clubId, userId, url);

      expect(result.certificateUrl).toBe(url);
    });
  });

  describe('getDogOverallStatus', () => {
    it('returns worst status among all vaccines', async () => {
      prisma.dog.findFirst.mockResolvedValue(mockDog);
      prisma.vaccineRecord.findMany.mockResolvedValue([
        { expiryDate: new Date('2030-01-01') },
        { expiryDate: new Date('2020-01-01') }, // expired
      ]);

      const status = await service.getDogOverallStatus(dogId, clubId);
      expect(status).toBe(VaccineStatus.EXPIRED);
    });
  });
});
