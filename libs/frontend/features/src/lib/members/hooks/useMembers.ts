import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, ApiClientError } from '@org/data-access';
import type { UpdateProfile, UpdateMemberRole } from '@org/types';

export interface MemberDto {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  status: 'ACTIVE' | 'SUSPENDED';
  suspendedAt: string | null;
  createdAt: string;
}

interface MembersListResponse {
  data: MemberDto[];
  meta: { total: number; page: number; pageSize: number };
}

interface MemberDetailResponse {
  data: MemberDto;
}

interface UseMembersOptions {
  search?: string;
  role?: string;
  page?: number;
  pageSize?: number;
}

export function useMembers(clubId: string | null, options: UseMembersOptions = {}) {
  const params = new URLSearchParams();
  if (options.search) params.set('search', options.search);
  if (options.role) params.set('role', options.role);
  if (options.page) params.set('page', String(options.page));
  if (options.pageSize) params.set('pageSize', String(options.pageSize));

  const queryString = params.toString();
  const endpoint = `/members${queryString ? `?${queryString}` : ''}`;

  return useQuery<MembersListResponse, ApiClientError>({
    queryKey: ['members', clubId, options],
    queryFn: () => apiClient.get<MembersListResponse>(endpoint),
    enabled: !!clubId,
  });
}

export function useMemberDetail(clubId: string | null, memberId: string | undefined) {
  return useQuery<MemberDetailResponse, ApiClientError>({
    queryKey: ['members', clubId, memberId],
    queryFn: () =>
      apiClient.get<MemberDetailResponse>(`/members/${memberId}`),
    enabled: !!clubId && !!memberId,
  });
}

export function useUpdateProfile(clubId: string | null) {
  const queryClient = useQueryClient();

  return useMutation<MemberDetailResponse, ApiClientError, { memberId: string; data: UpdateProfile }>({
    mutationFn: ({ memberId, data }) =>
      apiClient.patch<MemberDetailResponse>(`/members/${memberId}`, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['members', clubId] });
      queryClient.invalidateQueries({
        queryKey: ['members', clubId, variables.memberId],
      });
    },
  });
}

export function useUploadAvatar(clubId: string | null) {
  const queryClient = useQueryClient();

  return useMutation<MemberDetailResponse, ApiClientError, { memberId: string; file: File }>({
    mutationFn: async ({ memberId, file }) => {
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('accessToken');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL ?? '/api'}/members/${memberId}/avatar`,
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
          error.error ?? 'UPLOAD_ERROR',
          error.message ?? 'Upload failed',
        );
      }

      return response.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['members', clubId] });
      queryClient.invalidateQueries({
        queryKey: ['members', clubId, variables.memberId],
      });
    },
  });
}

export function useUpdateMemberRole(clubId: string | null) {
  const queryClient = useQueryClient();

  return useMutation<MemberDetailResponse, ApiClientError, { memberId: string; data: UpdateMemberRole }>({
    mutationFn: ({ memberId, data }) =>
      apiClient.patch<MemberDetailResponse>(`/members/${memberId}/role`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', clubId] });
    },
  });
}

export function useRemoveMember(clubId: string | null) {
  const queryClient = useQueryClient();

  return useMutation<{ data: { message: string } }, ApiClientError, { memberId: string }>({
    mutationFn: ({ memberId }) =>
      apiClient.delete<{ data: { message: string } }>(`/members/${memberId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', clubId] });
    },
  });
}

export function useSuspendMember(clubId: string | null) {
  const queryClient = useQueryClient();

  return useMutation<MemberDetailResponse, ApiClientError, { memberId: string }>({
    mutationFn: ({ memberId }) =>
      apiClient.patch<MemberDetailResponse>(`/members/${memberId}/suspend`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', clubId] });
    },
  });
}

export function useUnsuspendMember(clubId: string | null) {
  const queryClient = useQueryClient();

  return useMutation<MemberDetailResponse, ApiClientError, { memberId: string }>({
    mutationFn: ({ memberId }) =>
      apiClient.patch<MemberDetailResponse>(`/members/${memberId}/unsuspend`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', clubId] });
    },
  });
}
