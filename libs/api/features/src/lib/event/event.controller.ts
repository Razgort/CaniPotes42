import {
  Controller,
  Post,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Put,
  Delete,
  Query,
  Param,
  Body,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import {
  JwtAuthGuard,
  ClubGuard,
  RolesGuard,
  CurrentClub,
  CurrentUser,
  Roles,
  ZodValidationPipe,
} from '@org/api-core';
import type { JwtPayload } from '@org/api-core';
import {
  createEventSchema,
  updateEventSchema,
  eventStatusSchema,
  eventQuerySchema,
  rsvpSchema,
} from '@org/types';
import type { CreateEvent, UpdateEvent, EventStatusUpdate, EventQuery, Rsvp } from '@org/types';
import { EventService } from './event.service.js';

@Controller('events')
@UseGuards(JwtAuthGuard, ClubGuard)
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'OWNER')
  @UsePipes(new ZodValidationPipe(createEventSchema))
  async create(
    @Body() dto: CreateEvent,
    @CurrentUser() user: JwtPayload,
    @CurrentClub() clubId: string,
  ) {
    return this.eventService.createEvent(user.sub, clubId, dto);
  }

  @Get()
  async findAll(
    @CurrentClub() clubId: string,
    @CurrentUser() user: JwtPayload,
    @Query(new ZodValidationPipe(eventQuerySchema)) query: EventQuery,
  ) {
    return this.eventService.findAll(clubId, user.role, query, user.sub);
  }

  @Get(':eventId')
  async findOne(
    @CurrentClub() clubId: string,
    @CurrentUser() user: JwtPayload,
    @Param('eventId') eventId: string,
  ) {
    return this.eventService.findOne(clubId, eventId, user.role, user.sub);
  }

  @Put(':eventId/rsvp')
  @HttpCode(HttpStatus.OK)
  async upsertRsvp(
    @CurrentClub() clubId: string,
    @CurrentUser() user: JwtPayload,
    @Param('eventId') eventId: string,
    @Body(new ZodValidationPipe(rsvpSchema)) dto: Rsvp,
  ) {
    return this.eventService.upsertRsvp(clubId, eventId, user.sub, dto.status);
  }

  @Get(':eventId/participants')
  async getParticipants(
    @CurrentClub() clubId: string,
    @Param('eventId') eventId: string,
  ) {
    return this.eventService.getParticipants(clubId, eventId);
  }

  @Patch(':eventId')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'OWNER')
  async update(
    @CurrentClub() clubId: string,
    @Param('eventId') eventId: string,
    @Body(new ZodValidationPipe(updateEventSchema)) dto: UpdateEvent,
  ) {
    return this.eventService.update(clubId, eventId, dto);
  }

  @Patch(':eventId/status')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'OWNER')
  async updateStatus(
    @CurrentClub() clubId: string,
    @Param('eventId') eventId: string,
    @Body(new ZodValidationPipe(eventStatusSchema)) dto: EventStatusUpdate,
  ) {
    return this.eventService.updateStatus(clubId, eventId, dto);
  }

  @Delete(':eventId')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'OWNER')
  async remove(
    @CurrentClub() clubId: string,
    @Param('eventId') eventId: string,
  ) {
    return this.eventService.remove(clubId, eventId);
  }
}
