import { useQuery } from '@tanstack/react-query';
import { apiClient } from './api-client';
import type { EventParticipant, ParticipationCounts } from '@org/types';

export interface EventListItem {
  id: string;
  clubId: string;
  title: string;
  description: string | null;
  dateTime: string;
  latitude: number;
  longitude: number;
  locationName: string | null;
  status: string;
  createdById: string;
  participantCount: number;
  myRsvpStatus: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EventDetail extends EventListItem {
  participants: EventParticipant[];
  counts: ParticipationCounts;
}

export interface EventsResponse {
  data: EventListItem[];
  meta: { total: number; page: number; pageSize: number };
}

export function useEvents(clubId: string | null | undefined) {
  return useQuery({
    queryKey: ['events', clubId],
    queryFn: () =>
      apiClient.get<EventsResponse>(`/events`),
    enabled: !!clubId,
  });
}

export function useEvent(
  clubId: string | null | undefined,
  eventId: string | null | undefined,
) {
  return useQuery({
    queryKey: ['events', clubId, eventId],
    queryFn: () =>
      apiClient.get<{ data: EventDetail }>(`/events/${eventId}`),
    enabled: !!clubId && !!eventId,
  });
}
