import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@org/api-core';
import type { CreateEvent, UpdateEvent, EventStatusUpdate, EventQuery, EventParticipant, ParticipationCounts, Rsvp } from '@org/types';
import { EventStatus } from '@org/types';

export interface EventDto {
  id: string;
  clubId: string;
  title: string;
  description: string | null;
  dateTime: string;
  latitude: number;
  longitude: number;
  locationName: string | null;
  status: EventStatus;
  createdById: string;
  participantCount: number;
  myRsvpStatus: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EventsListResponse {
  data: EventDto[];
  meta: { total: number; page: number; pageSize: number };
}

@Injectable()
export class EventService {
  private readonly logger = new Logger(EventService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createEvent(
    userId: string,
    clubId: string,
    dto: CreateEvent,
  ): Promise<{ data: EventDto }> {
    const event = await (this.prisma as any).event.create({
      data: {
        clubId,
        createdById: userId,
        title: dto.title,
        description: dto.description ?? null,
        date: new Date(dto.dateTime),
        latitude: dto.latitude,
        longitude: dto.longitude,
        locationName: dto.locationName ?? null,
        status: 'DRAFT',
      },
    });

    this.logger.log(`Event created: ${event.id} in club ${clubId} by user ${userId}`);

    return { data: this.mapEvent(event) };
  }

  private mapEvent(event: any): EventDto {
    return {
      id: event.id,
      clubId: event.clubId,
      title: event.title,
      description: event.description ?? null,
      dateTime: event.date instanceof Date ? event.date.toISOString() : event.date,
      latitude: event.latitude,
      longitude: event.longitude,
      locationName: event.locationName ?? null,
      status: event.status,
      createdById: event.createdById,
      participantCount: event._count?.participants ?? 0,
      myRsvpStatus: event.participants?.[0]?.status ?? null,
      createdAt: event.createdAt instanceof Date ? event.createdAt.toISOString() : event.createdAt,
      updatedAt: event.updatedAt instanceof Date ? event.updatedAt.toISOString() : event.updatedAt,
    };
  }

  async findAll(
    clubId: string,
    role: string,
    params: EventQuery,
    userId?: string,
  ): Promise<EventsListResponse> {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = { clubId };

    // Members only see published events — ignores any status param
    if (role === 'MEMBER') {
      where['status'] = EventStatus.PUBLISHED;
    } else if (params.status) {
      where['status'] = params.status;
    }

    const [events, total] = await Promise.all([
      (this.prisma as any).event.findMany({
        where,
        include: {
          _count: { select: { participants: true } },
          ...(userId
            ? {
                participants: {
                  where: { userId },
                  select: { status: true },
                  take: 1,
                },
              }
            : {}),
        },
        orderBy: { date: 'asc' },
        skip,
        take: pageSize,
      }),
      (this.prisma as any).event.count({ where }),
    ]);

    return {
      data: events.map((e: any) => this.mapEvent(e)),
      meta: { total, page, pageSize },
    };
  }

  async findOne(
    clubId: string,
    eventId: string,
    role: string,
    userId?: string,
  ): Promise<{ data: EventDto & { participants: EventParticipant[]; counts: ParticipationCounts } }> {
    const event = await (this.prisma as any).event.findFirst({
      where: { id: eventId, clubId },
      include: {
        _count: { select: { participants: true } },
        participants: {
          where: { clubId },
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, avatarUrl: true },
            },
          },
          orderBy: { createdAt: 'asc' },
          ...(userId
            ? {}
            : { where: { clubId } }),
        },
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    // Members must not know draft events exist
    if (event.status === EventStatus.DRAFT && role === 'MEMBER') {
      throw new NotFoundException('Event not found');
    }

    const allParticipants: EventParticipant[] = event.participants.map((p: any) => ({
      userId: p.userId,
      firstName: p.user.firstName,
      lastName: p.user.lastName,
      avatarUrl: p.user.avatarUrl,
      status: p.status,
    }));

    const counts: ParticipationCounts = {
      going: allParticipants.filter((p) => p.status === 'GOING').length,
      maybe: allParticipants.filter((p) => p.status === 'MAYBE').length,
      notGoing: allParticipants.filter((p) => p.status === 'NOT_GOING').length,
    };

    const myEntry = userId
      ? event.participants.find((p: any) => p.userId === userId)
      : null;

    return {
      data: {
        ...this.mapEvent({ ...event, participants: myEntry ? [myEntry] : [] }),
        participants: allParticipants,
        counts,
      },
    };
  }

  async updateStatus(
    clubId: string,
    eventId: string,
    dto: EventStatusUpdate,
  ): Promise<{ data: EventDto }> {
    const existing = await (this.prisma as any).event.findFirst({
      where: { id: eventId, clubId },
    });

    if (!existing) {
      throw new NotFoundException('Event not found');
    }

    const updated = await (this.prisma as any).event.update({
      where: { id: eventId },
      data: { status: dto.status },
    });

    this.logger.log(`Event ${eventId} status → ${dto.status} in club ${clubId}`);

    return { data: this.mapEvent(updated) };
  }

  async update(
    clubId: string,
    eventId: string,
    dto: UpdateEvent,
  ): Promise<{ data: EventDto }> {
    const existing = await (this.prisma as any).event.findFirst({
      where: { id: eventId, clubId },
    });

    if (!existing) {
      throw new NotFoundException('Event not found');
    }

    // Map dateTime → date for Prisma; never update status via this endpoint
    const { dateTime, status: _status, ...rest } = dto as any;
    const data: Record<string, unknown> = { ...rest };
    if (dateTime !== undefined) {
      data['date'] = new Date(dateTime);
    }

    const updated = await (this.prisma as any).event.update({
      where: { id: eventId },
      data,
    });

    this.logger.log(`Event ${eventId} updated in club ${clubId}`);

    return { data: this.mapEvent(updated) };
  }

  async remove(clubId: string, eventId: string): Promise<{ data: { id: string } }> {
    const existing = await (this.prisma as any).event.findFirst({
      where: { id: eventId, clubId },
    });

    if (!existing) {
      throw new NotFoundException('Event not found');
    }

    // Prisma cascade deletes all EventParticipation records automatically
    await (this.prisma as any).event.delete({
      where: { id: eventId },
    });

    this.logger.log(`Event ${eventId} deleted from club ${clubId}`);

    return { data: { id: eventId } };
  }

  async getParticipants(
    clubId: string,
    eventId: string,
  ): Promise<{ data: { participants: EventParticipant[]; counts: ParticipationCounts } }> {
    const event = await (this.prisma as any).event.findFirst({
      where: { id: eventId, clubId },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    const rows = await (this.prisma as any).eventParticipation.findMany({
      where: { eventId, clubId },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const participants: EventParticipant[] = rows.map((r: any) => ({
      userId: r.userId,
      firstName: r.user.firstName,
      lastName: r.user.lastName,
      avatarUrl: r.user.avatarUrl,
      status: r.status,
    }));

    const counts: ParticipationCounts = {
      going: participants.filter((p) => p.status === 'GOING').length,
      maybe: participants.filter((p) => p.status === 'MAYBE').length,
      notGoing: participants.filter((p) => p.status === 'NOT_GOING').length,
    };

    return { data: { participants, counts } };
  }

  async upsertRsvp(
    clubId: string,
    eventId: string,
    userId: string,
    status: Rsvp['status'],
  ): Promise<{ data: { eventId: string; userId: string; status: string } }> {
    const event = await (this.prisma as any).event.findFirst({
      where: { id: eventId, clubId },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.status !== EventStatus.PUBLISHED) {
      throw new BadRequestException('Cannot RSVP to a draft event');
    }

    const now = new Date();
    if (event.date < now) {
      throw new BadRequestException('Cannot RSVP to a past event');
    }

    const participation = await (this.prisma as any).eventParticipation.upsert({
      where: { eventId_userId: { eventId, userId } },
      create: { eventId, userId, clubId, status },
      update: { status },
    });

    this.logger.log(`User ${userId} RSVP'd ${status} to event ${eventId}`);

    return { data: { eventId: participation.eventId, userId: participation.userId, status: participation.status } };
  }
}
