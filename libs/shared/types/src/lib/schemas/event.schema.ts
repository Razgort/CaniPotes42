import { z } from 'zod';
import { EventStatus } from '../enums.js';

export const createEventSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  dateTime: z.string().datetime(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  status: z.nativeEnum(EventStatus).default(EventStatus.DRAFT),
});

export const updateEventSchema = createEventSchema.partial();

export type CreateEvent = z.infer<typeof createEventSchema>;
export type UpdateEvent = z.infer<typeof updateEventSchema>;
