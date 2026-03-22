import { useMutation } from '@tanstack/react-query';
import { apiClient, ApiClientError, useAuth, queryClient } from '@org/data-access';
import { toast } from '@org/ui';
import type { CreateClub } from '@org/types';

interface CreateClubResponse {
  data: {
    id: string;
    name: string;
    federation: string;
    logo: string | null;
    contactEmail: string;
    description: string | null;
    createdAt: string;
    accessToken: string;
  };
}

export function useCreateClub() {
  const { updateClubSession } = useAuth();

  return useMutation<CreateClubResponse, ApiClientError, CreateClub>({
    mutationFn: (data) =>
      apiClient.post<CreateClubResponse>('/clubs', data),
    onSuccess: (response) => {
      const { data } = response;
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
