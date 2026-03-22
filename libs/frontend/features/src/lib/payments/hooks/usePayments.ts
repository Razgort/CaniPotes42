import { useQuery } from '@tanstack/react-query';
import { apiClient, ApiClientError } from '@org/data-access';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LicenseTypeColumn {
  id: string;
  name: string;
  season: string;
  paymentProvider: 'STRIPE' | 'HELLOASSO';
}

export interface MemberPaymentCell {
  licenseTypeId: string;
  licenseTypeName: string;
  season: string;
  provider: 'STRIPE' | 'HELLOASSO';
  status: 'COMPLETED' | 'PENDING' | 'FAILED' | 'REFUNDED' | null;
  amount: number | null;
  paymentDate: string | null;
  paymentId: string | null;
  transactionId: string | null;
}

export interface LicenseStatusRow {
  memberId: string;
  membershipId: string;
  memberName: string;
  payments: MemberPaymentCell[];
}

export interface LicenseStatusResponse {
  data: LicenseStatusRow[];
  licenseTypes: LicenseTypeColumn[];
}

export interface PaymentHistoryItem {
  id: string;
  memberName: string;
  userId: string;
  licenseTypeName: string;
  licenseTypeId: string;
  season: string;
  provider: 'STRIPE' | 'HELLOASSO';
  amount: number;
  status: 'COMPLETED' | 'PENDING' | 'FAILED' | 'REFUNDED';
  paymentDate: string | null;
  transactionId: string | null;
  createdAt: string;
}

export interface PaymentHistoryResponse {
  data: PaymentHistoryItem[];
  meta: { total: number; page: number; pageSize: number };
}

export interface MyPaymentItem {
  id: string;
  licenseTypeName: string;
  licenseTypeId: string;
  season: string;
  provider: 'STRIPE' | 'HELLOASSO';
  amount: number;
  status: 'COMPLETED' | 'PENDING' | 'FAILED' | 'REFUNDED';
  paymentDate: string | null;
  transactionId: string | null;
  createdAt: string;
}

export interface MyPaymentsResponse {
  data: MyPaymentItem[];
}

// ─── Query filters ─────────────────────────────────────────────────────────

export interface LicenseStatusFilters {
  season?: string;
  status?: 'ALL' | 'PAID' | 'PENDING' | 'UNPAID';
  provider?: 'ALL' | 'STRIPE' | 'HELLOASSO';
  search?: string;
}

export interface PaymentHistoryFilters {
  page?: number;
  pageSize?: number;
  season?: string;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useLicenseStatus(clubId: string | null, filters: LicenseStatusFilters = {}) {
  const params = new URLSearchParams();
  if (filters.season) params.set('season', filters.season);
  if (filters.status) params.set('status', filters.status);
  if (filters.provider) params.set('provider', filters.provider);
  if (filters.search) params.set('search', filters.search);
  const queryString = params.toString();

  return useQuery<LicenseStatusResponse, ApiClientError>({
    queryKey: ['license-status', clubId, filters],
    queryFn: () =>
      apiClient.get<LicenseStatusResponse>(
        `/payments/license-status${queryString ? `?${queryString}` : ''}`,
      ),
    enabled: !!clubId,
  });
}

export function usePaymentHistory(clubId: string | null, filters: PaymentHistoryFilters = {}) {
  const params = new URLSearchParams();
  if (filters.page) params.set('page', String(filters.page));
  if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
  if (filters.season) params.set('season', filters.season);
  const queryString = params.toString();

  return useQuery<PaymentHistoryResponse, ApiClientError>({
    queryKey: ['payment-history', clubId, filters],
    queryFn: () =>
      apiClient.get<PaymentHistoryResponse>(
        `/payments${queryString ? `?${queryString}` : ''}`,
      ),
    enabled: !!clubId,
  });
}

export function useMyPayments(clubId: string | null) {
  return useQuery<MyPaymentsResponse, ApiClientError>({
    queryKey: ['my-payments', clubId],
    queryFn: () => apiClient.get<MyPaymentsResponse>('/payments/my'),
    enabled: !!clubId,
  });
}

export function usePaymentDetail(clubId: string | null, paymentId: string | null) {
  return useQuery<{ data: PaymentHistoryItem }, ApiClientError>({
    queryKey: ['payment-detail', clubId, paymentId],
    queryFn: () =>
      apiClient.get<{ data: PaymentHistoryItem }>(`/payments/${paymentId}`),
    enabled: !!clubId && !!paymentId,
  });
}
