import { useMutation } from '@tanstack/react-query';
import { apiClient, ApiClientError, useAuth, queryClient } from '@org/data-access';
import { toast } from '@org/ui';
import type { CreateClub } from '@org/types';

type ClubCreatedPayload = {
  id: string;
  name: string;
  federation: string;
  logo: string | null;
  contactEmail: string;
  description: string | null;
  createdAt: string;
  accessToken: string;
};

interface CreateClubResponse {
  data: ClubCreatedPayload;
}

function unwrapClubCreated(raw: unknown): ClubCreatedPayload {
  if (
    raw &&
    typeof raw === 'object' &&
    'data' in raw &&
    (raw as CreateClubResponse).data &&
    typeof (raw as CreateClubResponse).data.accessToken === 'string'
  ) {
    return (raw as CreateClubResponse).data;
  }
  if (raw && typeof raw === 'object' && 'accessToken' in raw) {
    return raw as ClubCreatedPayload;
  }
  throw new Error('Invalid create club response');
}

export function useCreateClub() {
  const { updateClubSession } = useAuth();

  return useMutation<unknown, ApiClientError, CreateClub>({
    mutationFn: (data) => apiClient.post<unknown>('/clubs', data),
    onSuccess: (response) => {
      const data = unwrapClubCreated(response);
      updateClubSession({
        accessToken: data.accessToken,
        club: { id: data.id, name: data.name },
        role: 'OWNER',
      });
      queryClient.invalidateQueries();
      toast.success('Club cree avec succes !');
    },
    onError: () => {
      toast.error("Nous n'avons pas pu creer le club. Veuillez reessayer.");
    },
  });
}
