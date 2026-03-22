import { z } from 'zod';
import { EventStatus, ParticipationStatus } from '../enums.js';

export const createEventSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  dateTime: z.string().datetime(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  locationName: z.string().max(500).optional(),
  status: z.nativeEnum(EventStatus).default(EventStatus.DRAFT),
});

// status is intentionally excluded — use PATCH /events/:id/status for that
export const updateEventSchema = createEventSchema.omit({ status: true }).partial();

export type CreateEvent = z.infer<typeof createEventSchema>;
export type UpdateEvent = z.infer<typeof updateEventSchema>;

// Event list query (for feed pagination + filtering)
export const eventListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.nativeEnum(EventStatus).optional(),
});
export type EventListQuery = z.infer<typeof eventListQuerySchema>;

// Event response DTO (feed card shape)
export const eventResponseSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  date: z.string().datetime(),
  latitude: z.number(),
  longitude: z.number(),
  locationName: z.string().nullable(),
  status: z.nativeEnum(EventStatus),
  createdById: z.string().uuid(),
  participantCount: z.number().int().nonnegative(),
  myRsvpStatus: z.nativeEnum(ParticipationStatus).nullable(),
  createdAt: z.string().datetime(),
});
export type EventResponse = z.infer<typeof eventResponseSchema>;

// Alias for backward compatibility with controller imports
export const eventQuerySchema = eventListQuerySchema;
export type EventQuery = EventListQuery;
// Kept as alias of old naming: some stories may import as CreateEventQuery
export type CreateEventQuery = EventListQuery;

// Event status update (draft/publish toggle)
export const eventStatusSchema = z.object({
  status: z.nativeEnum(EventStatus),
});
export type EventStatusUpdate = z.infer<typeof eventStatusSchema>;

export const rsvpSchema = z.object({
  status: z.nativeEnum(ParticipationStatus),
});
export type Rsvp = z.infer<typeof rsvpSchema>;

export const eventParticipantSchema = z.object({
  userId: z.string().uuid(),
  firstName: z.string(),
  lastName: z.string(),
  avatarUrl: z.string().nullable(),
  status: z.nativeEnum(ParticipationStatus),
});
export type EventParticipant = z.infer<typeof eventParticipantSchema>;

export const participationCountsSchema = z.object({
  going: z.number(),
  maybe: z.number(),
  notGoing: z.number(),
});
export type ParticipationCounts = z.infer<typeof participationCountsSchema>;
