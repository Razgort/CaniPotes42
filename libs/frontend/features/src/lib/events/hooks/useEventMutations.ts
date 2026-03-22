import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, useAuth } from '@org/data-access';
import { toast } from '@org/ui';
import type { EventDetail } from '@org/data-access';
import type { EventStatus } from '@org/types';

// ─── Publish / Unpublish ────────────────────────────────────────────────────

export function useUpdateEventStatus(eventId: string) {
  const { activeClub } = useAuth();
  const clubId = activeClub?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (status: EventStatus) =>
      apiClient.patch<{ data: EventDetail }>(`/events/${eventId}/status`, { status }),

    onMutate: async (newStatus: EventStatus) => {
      await queryClient.cancelQueries({ queryKey: ['events', clubId, eventId] });
      const previous = queryClient.getQueryData<{ data: EventDetail }>(['events', clubId, eventId]);

      queryClient.setQueryData<{ data: EventDetail }>(['events', clubId, eventId], (old) => {
        if (!old) return old;
        return { data: { ...old.data, status: newStatus } };
      });

      // Also update in the list cache if present
      queryClient.setQueriesData<{ data: EventDetail[]; meta: unknown }>(
        { queryKey: ['events', clubId] },
        (old) => {
          if (!old || !Array.isArray(old.data)) return old;
          return {
            ...old,
            data: old.data.map((e: EventDetail) => (e.id === eventId ? { ...e, status: newStatus } : e)),
          };
        },
      );

      return { previous };
    },

    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['events', clubId, eventId], context.previous);
      }
      toast.error('Impossible de mettre à jour le statut');
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['events', clubId, eventId] });
      queryClient.invalidateQueries({ queryKey: ['events', clubId] });
    },
  });
}

// ─── Update event fields ────────────────────────────────────────────────────

export interface UpdateEventData {
  title?: string;
  description?: string | null;
  dateTime?: string;
  latitude?: number;
  longitude?: number;
  locationName?: string | null;
}

export function useUpdateEvent(eventId: string) {
  const { activeClub } = useAuth();
  const clubId = activeClub?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateEventData) =>
      apiClient.patch<{ data: EventDetail }>(`/events/${eventId}`, data),

    onSuccess: (response) => {
      queryClient.setQueryData(['events', clubId, eventId], response);
      queryClient.invalidateQueries({ queryKey: ['events', clubId] });
      toast.success('Événement mis à jour');
    },

    onError: () => {
      toast.error('Impossible de modifier l\'événement');
    },
  });
}

// ─── Delete event ───────────────────────────────────────────────────────────

export function useDeleteEvent() {
  const { activeClub } = useAuth();
  const clubId = activeClub?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (eventId: string) =>
      apiClient.delete<{ data: { id: string } }>(`/events/${eventId}`),

    onSuccess: (_data, eventId) => {
      queryClient.removeQueries({ queryKey: ['events', clubId, eventId] });
      queryClient.invalidateQueries({ queryKey: ['events', clubId] });
      toast.success('Événement supprimé');
    },

    onError: () => {
      toast.error('Impossible de supprimer l\'événement');
    },
  });
}
