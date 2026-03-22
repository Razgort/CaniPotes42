import { useQuery } from '@tanstack/react-query';
import { apiClient, useAuth } from '@org/data-access';
import type { EventResponse } from '@org/types';

interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
}

interface UseEventsOptions {
  page?: number;
  pageSize?: number;
  status?: 'DRAFT' | 'PUBLISHED';
}

export function useEvents(options: UseEventsOptions = {}) {
  const { activeClub } = useAuth();
  const clubId = activeClub?.id;
  const { page = 1, pageSize = 50, status } = options;

  const query = useQuery({
    queryKey: ['events', clubId, { page, status }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      if (status) params.set('status', status);

      const result = await apiClient.get<{ data: EventResponse[]; meta: PaginationMeta }>(
        `/events?${params.toString()}`,
      );
      return result;
    },
    enabled: !!clubId,
  });

  return {
    events: query.data?.data ?? [],
    meta: query.data?.meta,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
  };
}
