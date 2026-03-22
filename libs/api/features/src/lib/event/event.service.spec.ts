import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { EventService } from './event.service.js';
import { EventStatus } from '@org/types';

function createMockPrisma() {
  return {
    event: {
      create: vi.fn(),
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
    participants: [],
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
  
  // --------
  // createEvent
  // --------
  describe('createEvent', () => {
    const dto = {
      title: 'Canitrail training',
      description: 'Morning session',
      dateTime: '2026-04-15T09:00:00.000Z',
      latitude: 45.4397,
      longitude: 4.3872,
      locationName: 'Parc de Montaud',
    };

    it('creates an event with DRAFT status scoped to clubId', async () => {
      prisma.event.create.mockResolvedValue(mockDraftEvent);
      const result = await service.createEvent('user-uuid-1', mockClubId, dto as any);
      expect(prisma.event.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ clubId: mockClubId, createdById: 'user-uuid-1', status: 'DRAFT' }),
      });
      expect(result.data.status).toBe('DRAFT');
    });

    it('sets description/locationName to null when not provided', async () => {
      const minDto = { title: 'Quick', dateTime: '2026-04-15T09:00:00.000Z', latitude: 45.4, longitude: 4.3 };
      prisma.event.create.mockResolvedValue({ ...mockDraftEvent, description: null, locationName: null });
      await service.createEvent('user-uuid-1', mockClubId, minDto as any);
      expect(prisma.event.create).toHaveBeenCalledWith({ data: expect.objectContaining({ description: null, locationName: null }) });
    });

    it('converts dateTime string to Date object', async () => {
      prisma.event.create.mockResolvedValue(mockDraftEvent);
      await service.createEvent('user-uuid-1', mockClubId, dto as any);
      expect(prisma.event.create).toHaveBeenCalledWith({ data: expect.objectContaining({ date: new Date('2026-04-15T09:00:00.000Z') }) });
    });
  });

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
      expect(prisma.event.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ id: mockEventId, clubId: 'other-club' }) }),
      );
    });
  });

  // ────────────────────────────────────────────────────
  // findAll — participant count & RSVP (Story 5.2)
  // ────────────────────────────────────────────────────
  describe('findAll — participant count & RSVP', () => {
    const eventWithParticipants = {
      ...mockPublishedEvent,
      _count: { participants: 5 },
      participants: [{ status: 'GOING' }],
    };

    it('includes participant count in mapped DTO', async () => {
      prisma.event.findMany.mockResolvedValue([eventWithParticipants]);
      prisma.event.count.mockResolvedValue(1);
      const result = await service.findAll(mockClubId, 'MEMBER', {}, 'user-1');
      expect(result.data[0].participantCount).toBe(5);
    });

    it('includes current user RSVP status', async () => {
      prisma.event.findMany.mockResolvedValue([eventWithParticipants]);
      prisma.event.count.mockResolvedValue(1);
      const result = await service.findAll(mockClubId, 'MEMBER', {}, 'user-1');
      expect(result.data[0].myRsvpStatus).toBe('GOING');
    });

    it('returns null RSVP when user has no participation', async () => {
      prisma.event.findMany.mockResolvedValue([{ ...mockPublishedEvent, _count: { participants: 0 }, participants: [] }]);
      prisma.event.count.mockResolvedValue(1);
      const result = await service.findAll(mockClubId, 'MEMBER', {}, 'user-1');
      expect(result.data[0].myRsvpStatus).toBeNull();
    });

    it('includes _count and participants in Prisma query when userId provided', async () => {
      prisma.event.findMany.mockResolvedValue([]);
      prisma.event.count.mockResolvedValue(0);
      await service.findAll(mockClubId, 'MEMBER', {}, 'user-1');
      expect(prisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            _count: { select: { participants: true } },
          }),
        }),
      );
    });

    it('defaults participantCount to 0 when _count is missing', async () => {
      prisma.event.findMany.mockResolvedValue([{ ...mockPublishedEvent }]);
      prisma.event.count.mockResolvedValue(1);
      const result = await service.findAll(mockClubId, 'MEMBER', {});
      expect(result.data[0].participantCount).toBe(0);
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
      expect(prisma.event.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: mockEventId, clubId: 'other-club' }) }));
    });
  });
});
