import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient, ApiClientError } from '@org/data-access';
import type { CreateInvitation } from '@org/types';

interface CreateInvitationsResponse {
  data: { sent: number; duplicates: string[] };
}

interface InvitationStatusResponse {
  data: {
    clubName: string;
    clubLogo: string | null;
    email: string;
    status: 'valid' | 'expired' | 'already_accepted';
  };
}

interface AcceptInvitationResponse {
  data: {
    clubId?: string;
    clubName?: string;
    alreadyMember?: boolean;
    redirectTo?: string;
    token?: string;
    status?: string;
  };
}

export function useCreateInvitations(clubId: string | null) {
  return useMutation<CreateInvitationsResponse, ApiClientError, CreateInvitation>({
    mutationFn: (data) =>
      apiClient.post<CreateInvitationsResponse>(
        `/clubs/${clubId}/invitations`,
        data,
      ),
  });
}

export function useInvitationStatus(token: string | undefined) {
  return useQuery<InvitationStatusResponse, ApiClientError>({
    queryKey: ['invitation', token],
    queryFn: () =>
      apiClient.get<InvitationStatusResponse>(`/invitations/${token}`),
    enabled: !!token,
    retry: false,
  });
}

export function useAcceptInvitation() {
  return useMutation<AcceptInvitationResponse, ApiClientError, { token: string }>({
    mutationFn: ({ token }) =>
      apiClient.post<AcceptInvitationResponse>(`/invitations/${token}/accept`),
  });
}
