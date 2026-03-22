import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, ApiClientError, useAuth } from '@org/data-access';
import type { UpdateClub } from '@org/types';

interface ClubSettings {
  id: string;
  name: string;
  federation: string | null;
  logo: string | null;
  contactEmail: string;
  description: string | null;
}

interface ClubSettingsResponse {
  data: ClubSettings;
}

interface LogoUploadResponse {
  data: { id: string; logo: string };
}

export function useClubSettings() {
  const { activeClub } = useAuth();
  const clubId = activeClub?.id;

  return useQuery<ClubSettings, ApiClientError>({
    queryKey: ['club', clubId, 'settings'],
    queryFn: async () => {
      const res = await apiClient.get<ClubSettingsResponse>(
        `/clubs/${clubId}`,
      );
      return res.data;
    },
    enabled: !!clubId,
  });
}

export function useUpdateClubSettings() {
  const { activeClub } = useAuth();
  const clubId = activeClub?.id;
  const queryClient = useQueryClient();

  return useMutation<ClubSettings, ApiClientError, UpdateClub>({
    mutationFn: async (data) => {
      const res = await apiClient.patch<ClubSettingsResponse>(
        `/clubs/${clubId}`,
        data,
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['club', clubId, 'settings'] });
    },
  });
}

export function useUploadClubLogo() {
  const { activeClub, accessToken } = useAuth();
  const clubId = activeClub?.id;
  const queryClient = useQueryClient();

  return useMutation<LogoUploadResponse, ApiClientError, File>({
    mutationFn: async (file) => {
      const formData = new FormData();
      formData.append('file', file);

      const headers: Record<string, string> = {};
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      const response = await fetch(
        `${import.meta.env?.VITE_API_URL ?? '/api'}/clubs/${clubId}/logo`,
        {
          method: 'POST',
          headers,
          body: formData,
          credentials: 'include',
        },
      );

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new ApiClientError(
          response.status,
          errorBody.error || 'UPLOAD_FAILED',
          errorBody.message || "Echec de l'upload du logo",
        );
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['club', clubId, 'settings'] });
    },
  });
}
