import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, useAuth } from '@org/data-access';
import { toast } from '@org/ui';
import type { EventDetail } from '@org/data-access';

export type RsvpStatus = 'GOING' | 'MAYBE' | 'NOT_GOING';

export function useEventDetail(eventId: string | undefined) {
  const { activeClub } = useAuth();
  const clubId = activeClub?.id;

  const query = useQuery({
    queryKey: ['events', clubId, eventId],
    queryFn: () =>
      apiClient.get<{ data: EventDetail }>(`/events/${eventId}`),
    enabled: !!clubId && !!eventId,
  });

  return {
    event: query.data?.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    notFound: query.isError,
  };
}

export function useRsvpMutation(eventId: string) {
  const { activeClub } = useAuth();
  const clubId = activeClub?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (status: RsvpStatus) =>
      apiClient.put<{ data: { eventId: string; userId: string; status: string } }>(
        `/events/${eventId}/rsvp`,
        { status },
      ),

    onMutate: async (newStatus: RsvpStatus) => {
      await queryClient.cancelQueries({ queryKey: ['events', clubId, eventId] });

      const previous = queryClient.getQueryData<{ data: EventDetail }>(
        ['events', clubId, eventId],
      );

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

      return { previous };
    },

    onError: (_err, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['events', clubId, eventId], context.previous);
      }
      toast.error('Impossible de mettre à jour votre participation');
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['events', clubId, eventId] });
      queryClient.invalidateQueries({ queryKey: ['events', clubId] });
    },
  });
}
