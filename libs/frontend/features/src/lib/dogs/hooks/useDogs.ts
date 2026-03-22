import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, ApiClientError } from '@org/data-access';
import type { CreateDog, UpdateDog } from '@org/types';

export interface DogDto {
  id: string;
  name: string;
  breed: string | null;
  birthdate: string | null;
  chipNumber: string | null;
  photoUrl: string | null;
  userId: string;
  clubId: string;
  createdAt: string;
  updatedAt: string;
  owner?: {
    firstName: string;
    lastName: string;
  };
}

interface DogsListResponse {
  data: DogDto[];
  meta: { total: number; page: number; pageSize: number };
}

interface DogDetailResponse {
  data: DogDto;
}

export function useDogs(clubId: string | null) {
  return useQuery<DogsListResponse, ApiClientError>({
    queryKey: ['dogs', clubId],
    queryFn: () => apiClient.get<DogsListResponse>('/dogs'),
    enabled: !!clubId,
  });
}

export function useDogDetail(clubId: string | null, dogId: string | undefined) {
  return useQuery<DogDetailResponse, ApiClientError>({
    queryKey: ['dogs', clubId, dogId],
    queryFn: () => apiClient.get<DogDetailResponse>(`/dogs/${dogId}`),
    enabled: !!clubId && !!dogId,
  });
}

export function useCreateDog(clubId: string | null) {
  const queryClient = useQueryClient();

  return useMutation<DogDetailResponse, ApiClientError, CreateDog>({
    mutationFn: (data) => apiClient.post<DogDetailResponse>('/dogs', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dogs', clubId] });
    },
  });
}

export function useUpdateDog(clubId: string | null) {
  const queryClient = useQueryClient();

  return useMutation<DogDetailResponse, ApiClientError, { dogId: string; data: UpdateDog }>({
    mutationFn: ({ dogId, data }) =>
      apiClient.patch<DogDetailResponse>(`/dogs/${dogId}`, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['dogs', clubId] });
      queryClient.invalidateQueries({ queryKey: ['dogs', clubId, variables.dogId] });
    },
  });
}

export function useDeleteDog(clubId: string | null) {
  const queryClient = useQueryClient();

  return useMutation<void, ApiClientError, { dogId: string }>({
    mutationFn: ({ dogId }) => apiClient.delete<void>(`/dogs/${dogId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dogs', clubId] });
    },
  });
}

export function useUploadDogPhoto(clubId: string | null) {
  const queryClient = useQueryClient();

  return useMutation<DogDetailResponse, ApiClientError, { dogId: string; file: File }>({
    mutationFn: async ({ dogId, file }) => {
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('accessToken');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL ?? '/api'}/dogs/${dogId}/photo`,
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

      return response.json() as Promise<DogDetailResponse>;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['dogs', clubId] });
      queryClient.invalidateQueries({ queryKey: ['dogs', clubId, variables.dogId] });
    },
  });
}
