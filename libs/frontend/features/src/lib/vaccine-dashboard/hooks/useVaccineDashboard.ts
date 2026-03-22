import { useQuery } from '@tanstack/react-query';
import { apiClient, ApiClientError } from '@org/data-access';
import { VaccineStatus } from '@org/types';
import type { VaccineDashboardResponse } from '@org/types';

export type { VaccineDogRow, VaccineRecordRow, VaccineDashboardSummary } from '@org/types';

interface UseVaccineDashboardOptions {
  status?: VaccineStatus;
  search?: string;
  page?: number;
  pageSize?: number;
}

export function useVaccineDashboard(
  clubId: string | null,
  options: UseVaccineDashboardOptions = {},
) {
  const params = new URLSearchParams();
  if (options.status) params.set('status', options.status);
  if (options.search) params.set('search', options.search);
  if (options.page) params.set('page', String(options.page));
  if (options.pageSize) params.set('pageSize', String(options.pageSize));

  const queryString = params.toString();
  const endpoint = `/vaccine-dashboard${queryString ? `?${queryString}` : ''}`;

  return useQuery<VaccineDashboardResponse, ApiClientError>({
    queryKey: ['vaccine-dashboard', clubId, options],
    queryFn: () => apiClient.get<VaccineDashboardResponse>(endpoint),
    enabled: !!clubId,
  });
}
