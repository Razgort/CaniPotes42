import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VaccineService } from './vaccine.service.js';
import { VaccineStatus } from '@org/types';

// Mock PrismaService
const mockPrisma = {
  dog: {
    findMany: vi.fn(),
  },
};

describe('VaccineService', () => {
  let service: VaccineService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new VaccineService(mockPrisma as any);
  });

  describe('getClubVaccineSummary', () => {
    const now = new Date();
    const past10 = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 10);
    const future60 = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 60);
    const future15 = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 15);

    const mockDogs = [
      {
        id: 'dog-1',
        name: 'Balto',
        photoUrl: null,
        userId: 'user-1',
        user: { id: 'user-1', firstName: 'Marie', lastName: 'Dupont' },
        vaccineRecords: [
          { id: 'v1', vaccineName: 'Rage', dateAdministered: past10, expiryDate: future60 },
        ],
      },
      {
        id: 'dog-2',
        name: 'Luna',
        photoUrl: null,
        userId: 'user-2',
        user: { id: 'user-2', firstName: 'Pierre', lastName: 'Martin' },
        vaccineRecords: [
          { id: 'v2', vaccineName: 'DHPP', dateAdministered: past10, expiryDate: past10 },
        ],
      },
      {
        id: 'dog-3',
        name: 'Rex',
        photoUrl: null,
        userId: 'user-3',
        user: { id: 'user-3', firstName: 'Sophie', lastName: 'Blanc' },
        vaccineRecords: [
          { id: 'v3', vaccineName: 'Rage', dateAdministered: past10, expiryDate: future15 },
        ],
      },
    ];

    it('returns correct summary counts', async () => {
      mockPrisma.dog.findMany.mockResolvedValue(mockDogs);
      const result = await service.getClubVaccineSummary('club-1', { page: 1, pageSize: 20 });
      expect(result.data.summary).toEqual({ ok: 1, warning: 1, critical: 1 });
    });

    it('sorts dogs: EXPIRED first, then EXPIRING_SOON, then UP_TO_DATE', async () => {
      mockPrisma.dog.findMany.mockResolvedValue(mockDogs);
      const result = await service.getClubVaccineSummary('club-1', { page: 1, pageSize: 20 });
      const statuses = result.data.dogs.map((d: any) => d.overallStatus);
      expect(statuses[0]).toBe(VaccineStatus.EXPIRED);
      expect(statuses[1]).toBe(VaccineStatus.EXPIRING_SOON);
      expect(statuses[2]).toBe(VaccineStatus.UP_TO_DATE);
    });

    it('filters by status', async () => {
      mockPrisma.dog.findMany.mockResolvedValue(mockDogs);
      const result = await service.getClubVaccineSummary('club-1', {
        page: 1,
        pageSize: 20,
        status: VaccineStatus.EXPIRED,
      });
      expect(result.data.dogs).toHaveLength(1);
      expect(result.data.dogs[0].dogName).toBe('Luna');
    });

    it('filters by search (dog name, case-insensitive)', async () => {
      mockPrisma.dog.findMany.mockResolvedValue(mockDogs);
      const result = await service.getClubVaccineSummary('club-1', {
        page: 1,
        pageSize: 20,
        search: 'balto',
      });
      expect(result.data.dogs).toHaveLength(1);
      expect(result.data.dogs[0].dogName).toBe('Balto');
    });

    it('filters by search (owner name, case-insensitive)', async () => {
      mockPrisma.dog.findMany.mockResolvedValue(mockDogs);
      const result = await service.getClubVaccineSummary('club-1', {
        page: 1,
        pageSize: 20,
        search: 'pierre',
      });
      expect(result.data.dogs).toHaveLength(1);
      expect(result.data.dogs[0].dogName).toBe('Luna');
    });

    it('marks dog with no vaccine records as EXPIRED (missing)', async () => {
      mockPrisma.dog.findMany.mockResolvedValue([{
        id: 'dog-4', name: 'Buddy', photoUrl: null, userId: 'user-4',
        user: { id: 'user-4', firstName: 'Jean', lastName: 'Durand' },
        vaccineRecords: [],
      }]);
      const result = await service.getClubVaccineSummary('club-1', { page: 1, pageSize: 20 });
      expect(result.data.dogs[0].overallStatus).toBe(VaccineStatus.EXPIRED);
      expect(result.data.summary.critical).toBe(1);
    });

    it('summary counts are from full dataset, not paginated view', async () => {
      mockPrisma.dog.findMany.mockResolvedValue(mockDogs);
      const result = await service.getClubVaccineSummary('club-1', { page: 2, pageSize: 2 });
      expect(result.data.summary).toEqual({ ok: 1, warning: 1, critical: 1 });
    });

    it('returns paginated results with correct meta', async () => {
      mockPrisma.dog.findMany.mockResolvedValue(mockDogs);
      const result = await service.getClubVaccineSummary('club-1', { page: 1, pageSize: 2 });
      expect(result.data.dogs).toHaveLength(2);
      expect(result.meta).toEqual({ total: 3, page: 1, pageSize: 2 });
    });

    it('queries only dogs scoped to the given clubId', async () => {
      mockPrisma.dog.findMany.mockResolvedValue([]);
      await service.getClubVaccineSummary('club-abc', { page: 1, pageSize: 20 });
      expect(mockPrisma.dog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { clubId: 'club-abc' } }),
      );
    });

    it('returns empty summary and dogs when club has no dogs', async () => {
      mockPrisma.dog.findMany.mockResolvedValue([]);
      const result = await service.getClubVaccineSummary('club-1', { page: 1, pageSize: 20 });
      expect(result.data.summary).toEqual({ ok: 0, warning: 0, critical: 0 });
      expect(result.data.dogs).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });
  });
});
