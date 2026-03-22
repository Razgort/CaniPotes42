import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, ApiClientError } from '@org/data-access';
import type { CreateLicenseType, UpdateLicenseType, PaymentSessionResponse } from '@org/types';
import { toast } from '@org/ui';

export interface LicenseTypeDto {
  id: string;
  clubId: string;
  name: string;
  amount: string; // Prisma Decimal serializes as string
  season: string;
  paymentProvider: 'STRIPE' | 'HELLOASSO';
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface LicenseTypeListResponse {
  data: LicenseTypeDto[];
}

interface LicenseTypeResponse {
  data: LicenseTypeDto;
}

const licenseTypeKeys = {
  all: (clubId: string) => ['license-types', clubId] as const,
};

export function useLicenseTypes(clubId: string | null) {
  return useQuery<LicenseTypeListResponse, ApiClientError>({
    queryKey: clubId ? licenseTypeKeys.all(clubId) : ['license-types', null],
    queryFn: () => apiClient.get<LicenseTypeListResponse>(`/clubs/${clubId}/license-types`),
    enabled: !!clubId,
  });
}

export function useCreateLicenseType(clubId: string | null) {
  const queryClient = useQueryClient();

  return useMutation<LicenseTypeResponse, ApiClientError, CreateLicenseType>({
    mutationFn: (dto) =>
      apiClient.post<LicenseTypeResponse>(`/clubs/${clubId}/license-types`, dto),
    onSuccess: () => {
      if (clubId) {
        queryClient.invalidateQueries({ queryKey: licenseTypeKeys.all(clubId) });
      }
      toast.success('Type de licence ajouté');
    },
  });
}

export function useUpdateLicenseType(clubId: string | null) {
  const queryClient = useQueryClient();

  return useMutation<LicenseTypeResponse, ApiClientError, { id: string; data: UpdateLicenseType }>({
    mutationFn: ({ id, data }) =>
      apiClient.patch<LicenseTypeResponse>(`/clubs/${clubId}/license-types/${id}`, data),
    onSuccess: () => {
      if (clubId) {
        queryClient.invalidateQueries({ queryKey: licenseTypeKeys.all(clubId) });
      }
      toast.success('Type de licence mis à jour');
    },
  });
}

export function useDeleteLicenseType(clubId: string | null) {
  const queryClient = useQueryClient();

  return useMutation<{ data: { deleted: boolean } }, ApiClientError, string>({
    mutationFn: (id) =>
      apiClient.delete<{ data: { deleted: boolean } }>(`/clubs/${clubId}/license-types/${id}`),
    onSuccess: () => {
      if (clubId) {
        queryClient.invalidateQueries({ queryKey: licenseTypeKeys.all(clubId) });
      }
      toast.success('Type de licence supprimé');
    },
  });
}

// ─── Stripe Payment Hooks (Story 9.2) ────────────────────────────────────────


interface StripeStatusResponse {
  data: { status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' };
}

export function useInitiateStripePayment() {
  return useMutation<PaymentSessionResponse, ApiClientError, { licenseTypeId: string }>({
    mutationFn: ({ licenseTypeId }) =>
      apiClient.post<PaymentSessionResponse>('/payments/stripe/checkout', { licenseTypeId }),
    onSuccess: ({ sessionUrl }) => {
      // Redirect to Stripe-hosted checkout — no card data touches our servers
      window.location.href = sessionUrl;
    },
    onError: () => {
      toast.error("Impossible d'initier le paiement. Réessayez.");
    },
  });
}

// ─── HelloAsso Payment Hooks (Story 9.3) ─────────────────────────────────────

interface HelloAssoInitiateResponse {
  redirectUrl: string;
}

export function useInitiateHelloAssoPayment() {
  return useMutation<HelloAssoInitiateResponse, ApiClientError, { licenseTypeId: string }>({
    mutationFn: ({ licenseTypeId }) =>
      apiClient.post<HelloAssoInitiateResponse>('/payments/helloasso/initiate', { licenseTypeId }),
    onSuccess: ({ redirectUrl }) => {
      window.location.href = redirectUrl;
    },
    onError: () => {
      toast.error("Impossible d'initier le paiement HelloAsso. Réessayez.");
    },
  });
}

export function useStripePaymentStatus(sessionId: string | null) {
  return useQuery<StripeStatusResponse, ApiClientError>({
    queryKey: ['payment-status', 'stripe', sessionId],
    queryFn: () =>
      apiClient.get<StripeStatusResponse>(`/payments/stripe/status?sessionId=${sessionId}`),
    enabled: !!sessionId,
    refetchInterval: (query) => {
      const status = query.state.data?.data?.status;
      if (status === 'COMPLETED' || status === 'FAILED' || status === 'REFUNDED') {
        return false; // stop polling when terminal state reached
      }
      return 2000; // poll every 2 seconds
    },
    gcTime: 60_000,
  });
}
