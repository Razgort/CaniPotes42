import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { EventService } from './event.service.js';
import { EventStatus } from '@org/types';

function createMockPrisma() {
  return {
    event: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
  };
}

describe('EventService', () => {
  let service: EventService;
  let prisma: ReturnType<typeof createMockPrisma>;
  const mockClubId = 'club-uuid-1';
  const mockEventId = 'event-uuid-1';
  const mockDraftEvent = {
    id: mockEventId,
    clubId: mockClubId,
    createdById: 'user-uuid-1',
    title: 'Canitrail training',
    description: 'Morning session',
    date: new Date('2026-04-15T09:00:00.000Z'),
    latitude: 45.4397,
    longitude: 4.3872,
    locationName: 'Parc de Montaud',
    status: EventStatus.DRAFT,
    createdAt: new Date('2026-03-22T00:00:00Z'),
    updatedAt: new Date('2026-03-22T00:00:00Z'),
  };
  const mockPublishedEvent = { ...mockDraftEvent, status: EventStatus.PUBLISHED };

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = createMockPrisma();
    service = new EventService(prisma as never);
  });

  // ────────────────────────────────────────────────────
  // findAll — role-based visibility
  // ────────────────────────────────────────────────────
  describe('findAll', () => {
    it('MEMBER: only returns PUBLISHED events', async () => {
      prisma.event.findMany.mockResolvedValue([mockPublishedEvent]);
      prisma.event.count.mockResolvedValue(1);
      await service.findAll(mockClubId, 'MEMBER', {});
      expect(prisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { clubId: mockClubId, status: EventStatus.PUBLISHED } }),
      );
    });

    it('ADMIN: returns all events when no status filter', async () => {
      prisma.event.findMany.mockResolvedValue([mockDraftEvent, mockPublishedEvent]);
      prisma.event.count.mockResolvedValue(2);
      await service.findAll(mockClubId, 'ADMIN', {});
      expect(prisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { clubId: mockClubId } }),
      );
    });

    it('ADMIN: filters by DRAFT when status param provided', async () => {
      prisma.event.findMany.mockResolvedValue([mockDraftEvent]);
      prisma.event.count.mockResolvedValue(1);
      await service.findAll(mockClubId, 'ADMIN', { status: EventStatus.DRAFT });
      expect(prisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { clubId: mockClubId, status: EventStatus.DRAFT } }),
      );
    });

    it('MEMBER: ignores status param — enforces PUBLISHED only', async () => {
      prisma.event.findMany.mockResolvedValue([]);
      prisma.event.count.mockResolvedValue(0);
      await service.findAll(mockClubId, 'MEMBER', { status: EventStatus.DRAFT });
      expect(prisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { clubId: mockClubId, status: EventStatus.PUBLISHED } }),
      );
    });

    it('returns correct pagination meta', async () => {
      prisma.event.findMany.mockResolvedValue([]);
      prisma.event.count.mockResolvedValue(5);
      const result = await service.findAll(mockClubId, 'ADMIN', { page: 1, pageSize: 10 });
      expect(result.meta).toEqual({ total: 5, page: 1, pageSize: 10 });
    });
  });

  // ────────────────────────────────────────────────────
  // findOne — draft visibility guard
  // ────────────────────────────────────────────────────
  describe('findOne', () => {
    it('ADMIN: returns draft event', async () => {
      prisma.event.findFirst.mockResolvedValue(mockDraftEvent);
      const result = await service.findOne(mockClubId, mockEventId, 'ADMIN');
      expect(result.data.status).toBe(EventStatus.DRAFT);
    });

    it('MEMBER: throws NotFoundException for draft (not ForbiddenException)', async () => {
      prisma.event.findFirst.mockResolvedValue(mockDraftEvent);
      await expect(service.findOne(mockClubId, mockEventId, 'MEMBER')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException for non-existent event', async () => {
      prisma.event.findFirst.mockResolvedValue(null);
      await expect(service.findOne(mockClubId, mockEventId, 'ADMIN')).rejects.toThrow(NotFoundException);
    });

    it('tenant isolation: wrong clubId raises NotFoundException', async () => {
      prisma.event.findFirst.mockResolvedValue(null);
      await expect(service.findOne('other-club', mockEventId, 'ADMIN')).rejects.toThrow(NotFoundException);
      expect(prisma.event.findFirst).toHaveBeenCalledWith({ where: { id: mockEventId, clubId: 'other-club' } });
    });
  });

  // ────────────────────────────────────────────────────
  // updateStatus — publish / unpublish
  // ────────────────────────────────────────────────────
  describe('updateStatus', () => {
    it('publishes a DRAFT event', async () => {
      prisma.event.findFirst.mockResolvedValue(mockDraftEvent);
      prisma.event.update.mockResolvedValue(mockPublishedEvent);
      const result = await service.updateStatus(mockClubId, mockEventId, { status: EventStatus.PUBLISHED });
      expect(prisma.event.update).toHaveBeenCalledWith({
        where: { id: mockEventId },
        data: { status: EventStatus.PUBLISHED },
      });
      expect(result.data.status).toBe(EventStatus.PUBLISHED);
    });

    it('unpublishes a PUBLISHED event', async () => {
      prisma.event.findFirst.mockResolvedValue(mockPublishedEvent);
      prisma.event.update.mockResolvedValue(mockDraftEvent);
      const result = await service.updateStatus(mockClubId, mockEventId, { status: EventStatus.DRAFT });
      expect(result.data.status).toBe(EventStatus.DRAFT);
    });

    it('throws NotFoundException for non-existent event', async () => {
      prisma.event.findFirst.mockResolvedValue(null);
      await expect(
        service.updateStatus(mockClubId, mockEventId, { status: EventStatus.PUBLISHED }),
      ).rejects.toThrow(NotFoundException);
    });

    it('tenant isolation: scopes findFirst by clubId', async () => {
      prisma.event.findFirst.mockResolvedValue(null);
      await expect(
        service.updateStatus('other-club', mockEventId, { status: EventStatus.PUBLISHED }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ────────────────────────────────────────────────────
  // update — edit event fields (status excluded)
  // ────────────────────────────────────────────────────
  describe('update', () => {
    it('updates provided fields', async () => {
      prisma.event.findFirst.mockResolvedValue(mockDraftEvent);
      prisma.event.update.mockResolvedValue({ ...mockDraftEvent, title: 'New title' });
      const result = await service.update(mockClubId, mockEventId, { title: 'New title' });
      expect(result.data.title).toBe('New title');
    });

    it('maps dateTime field to date for Prisma', async () => {
      prisma.event.findFirst.mockResolvedValue(mockDraftEvent);
      prisma.event.update.mockResolvedValue(mockDraftEvent);
      await service.update(mockClubId, mockEventId, { dateTime: '2026-05-01T10:00:00.000Z' });
      const callData = (prisma.event.update as ReturnType<typeof vi.fn>).mock.calls[0][0].data;
      expect(callData.date).toEqual(new Date('2026-05-01T10:00:00.000Z'));
      expect(callData.dateTime).toBeUndefined();
    });

    it('strips status even if passed (should not change via this endpoint)', async () => {
      prisma.event.findFirst.mockResolvedValue(mockDraftEvent);
      prisma.event.update.mockResolvedValue(mockDraftEvent);
      await service.update(mockClubId, mockEventId, { title: 'X', status: EventStatus.PUBLISHED } as any);
      const callData = (prisma.event.update as ReturnType<typeof vi.fn>).mock.calls[0][0].data;
      expect(callData.status).toBeUndefined();
    });

    it('throws NotFoundException for non-existent event', async () => {
      prisma.event.findFirst.mockResolvedValue(null);
      await expect(service.update(mockClubId, mockEventId, { title: 'X' })).rejects.toThrow(NotFoundException);
    });
  });

  // ────────────────────────────────────────────────────
  // remove — delete with cascade
  // ────────────────────────────────────────────────────
  describe('remove', () => {
    it('deletes event and returns its id', async () => {
      prisma.event.findFirst.mockResolvedValue(mockDraftEvent);
      prisma.event.delete.mockResolvedValue(mockDraftEvent);
      const result = await service.remove(mockClubId, mockEventId);
      expect(prisma.event.delete).toHaveBeenCalledWith({ where: { id: mockEventId } });
      expect(result.data.id).toBe(mockEventId);
    });

    it('single prisma.event.delete call — cascade handles EventParticipation', async () => {
      prisma.event.findFirst.mockResolvedValue(mockDraftEvent);
      prisma.event.delete.mockResolvedValue(mockDraftEvent);
      await service.remove(mockClubId, mockEventId);
      expect(prisma.event.delete).toHaveBeenCalledTimes(1);
    });

    it('throws NotFoundException for non-existent event', async () => {
      prisma.event.findFirst.mockResolvedValue(null);
      await expect(service.remove(mockClubId, mockEventId)).rejects.toThrow(NotFoundException);
    });

    it('tenant isolation: scopes findFirst by clubId', async () => {
      prisma.event.findFirst.mockResolvedValue(null);
      await expect(service.remove('other-club', mockEventId)).rejects.toThrow(NotFoundException);
      expect(prisma.event.findFirst).toHaveBeenCalledWith({ where: { id: mockEventId, clubId: 'other-club' } });
    });
  });
});
