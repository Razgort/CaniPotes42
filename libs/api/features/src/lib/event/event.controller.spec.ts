import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { EventController } from './event.controller.js';
import { EventService } from './event.service.js';
import { EventStatus } from '@org/types';

describe('EventController', () => {
  let controller: EventController;

  const mockEventService = {
    findAll: vi.fn(),
    findOne: vi.fn(),
    createEvent: vi.fn(),
    update: vi.fn(),
    updateStatus: vi.fn(),
    remove: vi.fn(),
    upsertRsvp: vi.fn(),
    getParticipants: vi.fn(),
  };

  const mockUser = { sub: 'user-1', email: 'test@test.com', activeClubId: 'club-1', role: 'MEMBER' as const };
  const mockAdmin = { sub: 'admin-1', email: 'admin@test.com', activeClubId: 'club-1', role: 'ADMIN' as const };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventController],
      providers: [{ provide: EventService, useValue: mockEventService }],
    }).compile();

    controller = module.get<EventController>(EventController);
  });

  // ────────────────────────────────────────────────────
  // findAll
  // ────────────────────────────────────────────────────
  describe('findAll', () => {
    it('delegates to service with clubId, role, query, and userId', async () => {
      const query = { page: 1, pageSize: 20 };
      mockEventService.findAll.mockResolvedValue({ data: [], meta: { total: 0, page: 1, pageSize: 20 } });

      await controller.findAll('club-1', mockUser, query as any);

      expect(mockEventService.findAll).toHaveBeenCalledWith('club-1', 'MEMBER', query, 'user-1');
    });

    it('returns paginated envelope from service', async () => {
      const expected = {
        data: [{ id: 'e1', title: 'Test', participantCount: 3, myRsvpStatus: 'GOING' }],
        meta: { total: 1, page: 1, pageSize: 20 },
      };
      mockEventService.findAll.mockResolvedValue(expected);

      const result = await controller.findAll('club-1', mockAdmin, { page: 1, pageSize: 20 } as any);

      expect(result).toEqual(expected);
    });
  });

  // ────────────────────────────────────────────────────
  // create
  // ────────────────────────────────────────────────────
  describe('create', () => {
    const dto = {
      title: 'Canitrail training',
      description: 'Morning session',
      dateTime: '2026-04-15T09:00:00.000Z',
      latitude: 45.4397,
      longitude: 4.3872,
      locationName: 'Parc de Montaud',
    };

    it('delegates to service with userId, clubId, and dto', async () => {
      mockEventService.createEvent.mockResolvedValue({ data: { id: 'event-1', status: 'DRAFT' } });

      await controller.create(dto as any, mockAdmin, 'club-1');

      expect(mockEventService.createEvent).toHaveBeenCalledWith('admin-1', 'club-1', dto);
    });

    it('returns created event with DRAFT status', async () => {
      mockEventService.createEvent.mockResolvedValue({ data: { id: 'event-1', status: 'DRAFT', title: dto.title } });

      const result = await controller.create(dto as any, mockAdmin, 'club-1');

      expect(result.data.status).toBe('DRAFT');
      expect(result.data.id).toBe('event-1');
    });
  });

  // ────────────────────────────────────────────────────
  // findOne
  // ────────────────────────────────────────────────────
  describe('findOne', () => {
    it('delegates to service with clubId, eventId, role, and userId', async () => {
      mockEventService.findOne.mockResolvedValue({ data: { id: 'event-1' } });

      await controller.findOne('club-1', mockUser, 'event-1');

      expect(mockEventService.findOne).toHaveBeenCalledWith('club-1', 'event-1', 'MEMBER', 'user-1');
    });

    it('admin role is forwarded', async () => {
      mockEventService.findOne.mockResolvedValue({ data: { id: 'event-1', status: EventStatus.DRAFT } });

      await controller.findOne('club-1', mockAdmin, 'event-1');

      expect(mockEventService.findOne).toHaveBeenCalledWith('club-1', 'event-1', 'ADMIN', 'admin-1');
    });
  });

  // ────────────────────────────────────────────────────
  // update — PATCH /events/:eventId
  // ────────────────────────────────────────────────────
  describe('update', () => {
    it('delegates to service with clubId, eventId, and dto', async () => {
      const dto = { title: 'Updated title' };
      mockEventService.update.mockResolvedValue({ data: { id: 'event-1', title: 'Updated title' } });

      await controller.update('club-1', 'event-1', dto as any);

      expect(mockEventService.update).toHaveBeenCalledWith('club-1', 'event-1', dto);
    });

    it('returns updated event from service', async () => {
      mockEventService.update.mockResolvedValue({ data: { id: 'event-1', title: 'New title' } });

      const result = await controller.update('club-1', 'event-1', { title: 'New title' } as any);

      expect(result.data.title).toBe('New title');
    });
  });

  // ────────────────────────────────────────────────────
  // updateStatus — PATCH /events/:eventId/status
  // ────────────────────────────────────────────────────
  describe('updateStatus', () => {
    it('delegates publish to service', async () => {
      mockEventService.updateStatus.mockResolvedValue({
        data: { id: 'event-1', status: EventStatus.PUBLISHED },
      });

      await controller.updateStatus('club-1', 'event-1', { status: EventStatus.PUBLISHED });

      expect(mockEventService.updateStatus).toHaveBeenCalledWith('club-1', 'event-1', {
        status: EventStatus.PUBLISHED,
      });
    });

    it('delegates unpublish to service', async () => {
      mockEventService.updateStatus.mockResolvedValue({
        data: { id: 'event-1', status: EventStatus.DRAFT },
      });

      await controller.updateStatus('club-1', 'event-1', { status: EventStatus.DRAFT });

      expect(mockEventService.updateStatus).toHaveBeenCalledWith('club-1', 'event-1', {
        status: EventStatus.DRAFT,
      });
    });

    it('returns updated status from service', async () => {
      mockEventService.updateStatus.mockResolvedValue({
        data: { id: 'event-1', status: EventStatus.PUBLISHED },
      });

      const result = await controller.updateStatus('club-1', 'event-1', { status: EventStatus.PUBLISHED });

      expect(result.data.status).toBe(EventStatus.PUBLISHED);
    });
  });

  // ────────────────────────────────────────────────────
  // remove — DELETE /events/:eventId
  // ────────────────────────────────────────────────────
  describe('remove', () => {
    it('delegates to service with clubId and eventId', async () => {
      mockEventService.remove.mockResolvedValue({ data: { id: 'event-1' } });

      await controller.remove('club-1', 'event-1');

      expect(mockEventService.remove).toHaveBeenCalledWith('club-1', 'event-1');
    });

    it('returns deleted event id', async () => {
      mockEventService.remove.mockResolvedValue({ data: { id: 'event-1' } });

      const result = await controller.remove('club-1', 'event-1');

      expect(result.data.id).toBe('event-1');
    });
  });

  // ────────────────────────────────────────────────────
  // upsertRsvp — PUT /events/:eventId/rsvp
  // ────────────────────────────────────────────────────
  describe('upsertRsvp', () => {
    it('delegates to service with clubId, eventId, userId, and status', async () => {
      mockEventService.upsertRsvp.mockResolvedValue({
        data: { eventId: 'event-1', userId: 'user-1', status: 'GOING' },
      });

      await controller.upsertRsvp('club-1', mockUser, 'event-1', { status: 'GOING' as any });

      expect(mockEventService.upsertRsvp).toHaveBeenCalledWith('club-1', 'event-1', 'user-1', 'GOING');
    });

    it('returns rsvp result', async () => {
      mockEventService.upsertRsvp.mockResolvedValue({
        data: { eventId: 'event-1', userId: 'user-1', status: 'GOING' },
      });

      const result = await controller.upsertRsvp('club-1', mockUser, 'event-1', { status: 'GOING' as any });

      expect(result.data.status).toBe('GOING');
    });

    it('forwards BadRequestException for past events', async () => {
      const { BadRequestException } = await import('@nestjs/common');
      mockEventService.upsertRsvp.mockRejectedValue(new BadRequestException('Cannot RSVP to a past event'));

      await expect(
        controller.upsertRsvp('club-1', mockUser, 'event-1', { status: 'GOING' as any }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ────────────────────────────────────────────────────
  // getParticipants — GET /events/:eventId/participants
  // ────────────────────────────────────────────────────
  describe('getParticipants', () => {
    it('delegates to service and returns participants with counts', async () => {
      const response = {
        data: {
          participants: [
            { userId: 'u1', firstName: 'Julie', lastName: 'Martin', avatarUrl: null, status: 'GOING' },
          ],
          counts: { going: 1, maybe: 0, notGoing: 0 },
        },
      };
      mockEventService.getParticipants.mockResolvedValue(response);

      const result = await controller.getParticipants('club-1', 'event-1');

      expect(mockEventService.getParticipants).toHaveBeenCalledWith('club-1', 'event-1');
      expect(result.data.counts.going).toBe(1);
    });
  });
});
