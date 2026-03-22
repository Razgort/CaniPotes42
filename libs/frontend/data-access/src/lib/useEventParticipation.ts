import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './api-client';
import { toast } from '@org/ui';
import type { EventParticipant, ParticipationCounts } from '@org/types';
import type { EventListItem, EventDetail, EventsResponse } from './useEvents';

export type RsvpStatus = 'GOING' | 'MAYBE' | 'NOT_GOING';

export function useEventParticipants(
  clubId: string | null | undefined,
  eventId: string | null | undefined,
) {
  return useQuery({
    queryKey: ['events', clubId, eventId, 'participants'],
    queryFn: () =>
      apiClient.get<{ data: { participants: EventParticipant[]; counts: ParticipationCounts } }>(
        `/events/${eventId}/participants`,
      ),
    enabled: !!clubId && !!eventId,
  });
}

export function useRsvpMutation(
  clubId: string | null | undefined,
  eventId: string | null | undefined,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (status: RsvpStatus) =>
      apiClient.put<{ data: { eventId: string; userId: string; status: string } }>(
        `/events/${eventId}/rsvp`,
        { status },
      ),

    onMutate: async (newStatus: RsvpStatus) => {
      // Cancel any in-flight queries to avoid overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: ['events', clubId, eventId] });
      await queryClient.cancelQueries({ queryKey: ['events', clubId] });

      // Snapshot previous values for rollback
      const previousDetail = queryClient.getQueryData<{ data: EventDetail }>(
        ['events', clubId, eventId],
      );
      const previousList = queryClient.getQueryData<EventsResponse>(
        ['events', clubId],
      );

      // Optimistically update event detail
      queryClient.setQueryData<{ data: EventDetail }>(
        ['events', clubId, eventId],
        (old) => {
          if (!old) return old;
          const prevStatus = old.data.myRsvpStatus as RsvpStatus | null;

          const newCounts = { ...old.data.counts };
          if (prevStatus) {
            if (prevStatus === 'GOING') newCounts.going = Math.max(0, newCounts.going - 1);
            if (prevStatus === 'MAYBE') newCounts.maybe = Math.max(0, newCounts.maybe - 1);
            if (prevStatus === 'NOT_GOING') newCounts.notGoing = Math.max(0, newCounts.notGoing - 1);
          }
          if (newStatus === 'GOING') newCounts.going += 1;
          if (newStatus === 'MAYBE') newCounts.maybe += 1;
          if (newStatus === 'NOT_GOING') newCounts.notGoing += 1;

          return {
            data: {
              ...old.data,
              myRsvpStatus: newStatus,
              participantCount: newCounts.going,
              counts: newCounts,
            },
          };
        },
      );

      // Optimistically update event list
      queryClient.setQueryData<EventsResponse>(
        ['events', clubId],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((event: EventListItem) => {
              if (event.id !== eventId) return event;
              const prevStatus = event.myRsvpStatus as RsvpStatus | null;
              let delta = 0;
              if (prevStatus === 'GOING') delta -= 1;
              if (newStatus === 'GOING') delta += 1;
              return {
                ...event,
                myRsvpStatus: newStatus,
                participantCount: Math.max(0, event.participantCount + delta),
              };
            }),
          };
        },
      );

      return { previousDetail, previousList };
    },

    onError: (_err, _variables, context) => {
      // Revert to pre-mutation state
      if (context?.previousDetail) {
        queryClient.setQueryData(['events', clubId, eventId], context.previousDetail);
      }
      if (context?.previousList) {
        queryClient.setQueryData(['events', clubId], context.previousList);
      }
      toast.error('Impossible de mettre à jour votre participation');
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['events', clubId, eventId] });
      queryClient.invalidateQueries({ queryKey: ['events', clubId, eventId, 'participants'] });
      queryClient.invalidateQueries({ queryKey: ['events', clubId] });
    },
  });
}
