import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, ApiClientError } from '@org/data-access';
import type { CreateVaccine } from '@org/types';
import type { VaccineStatusValue } from '@org/ui';

export interface VaccineDto {
  id: string;
  dogId: string;
  vaccineName: string;
  dateAdministered: string;
  expiryDate: string | null;
  certificateUrl: string | null;
  status: VaccineStatusValue;
  createdAt: string;
  updatedAt: string;
}

interface VaccinesListResponse {
  data: VaccineDto[];
}

interface VaccineDetailResponse {
  data: VaccineDto;
}

export function useVaccines(clubId: string | null, dogId: string | undefined) {
  return useQuery<VaccineDto[], ApiClientError>({
    queryKey: ['vaccines', clubId, dogId],
    queryFn: async () => {
      const res = await apiClient.get<VaccineDto[] | VaccinesListResponse>(
        `/dogs/${dogId}/vaccines`,
      );
      // Handle both wrapped and unwrapped responses
      return Array.isArray(res) ? res : (res as VaccinesListResponse).data ?? res;
    },
    enabled: !!clubId && !!dogId,
  });
}

export function useCreateVaccine(clubId: string | null, dogId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<VaccineDto, ApiClientError, CreateVaccine>({
    mutationFn: async (data) => {
      const res = await apiClient.post<VaccineDto | VaccineDetailResponse>(
        `/dogs/${dogId}/vaccines`,
        data,
      );
      return (res as VaccineDetailResponse).data ?? res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vaccines', clubId, dogId] });
      queryClient.invalidateQueries({ queryKey: ['dogs', clubId, dogId] });
      queryClient.invalidateQueries({ queryKey: ['dogs', clubId] });
    },
  });
}

export function useUpdateVaccine(clubId: string | null, dogId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<VaccineDto, ApiClientError, { vaccineId: string; data: Partial<CreateVaccine> }>({
    mutationFn: async ({ vaccineId, data }) => {
      const res = await apiClient.patch<VaccineDto | VaccineDetailResponse>(
        `/dogs/${dogId}/vaccines/${vaccineId}`,
        data,
      );
      return (res as VaccineDetailResponse).data ?? res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vaccines', clubId, dogId] });
      queryClient.invalidateQueries({ queryKey: ['dogs', clubId, dogId] });
    },
  });
}

export function useDeleteVaccine(clubId: string | null, dogId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<void, ApiClientError, { vaccineId: string }>({
    mutationFn: ({ vaccineId }) =>
      apiClient.delete<void>(`/dogs/${dogId}/vaccines/${vaccineId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vaccines', clubId, dogId] });
      queryClient.invalidateQueries({ queryKey: ['dogs', clubId, dogId] });
      queryClient.invalidateQueries({ queryKey: ['dogs', clubId] });
    },
  });
}

export function useUploadCertificate(clubId: string | null, dogId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<VaccineDto, ApiClientError, { vaccineId: string; file: File }>({
    mutationFn: async ({ vaccineId, file }) => {
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('accessToken');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL ?? '/api'}/dogs/${dogId}/vaccines/${vaccineId}/certificate`,
        {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        },
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new ApiClientError(
          response.status,
          (error as any).error ?? 'UPLOAD_ERROR',
          (error as any).message ?? 'Upload failed',
        );
      }

      const res = (await response.json()) as VaccineDto | VaccineDetailResponse;
      return (res as VaccineDetailResponse).data ?? res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vaccines', clubId, dogId] });
    },
  });
}

export function useDeleteCertificate(clubId: string | null, dogId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<void, ApiClientError, { vaccineId: string }>({
    mutationFn: ({ vaccineId }) =>
      apiClient.delete<void>(`/dogs/${dogId}/vaccines/${vaccineId}/certificate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vaccines', clubId, dogId] });
    },
  });
}
