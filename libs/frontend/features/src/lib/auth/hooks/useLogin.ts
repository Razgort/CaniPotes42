import { useMutation } from '@tanstack/react-query';
import { apiClient, ApiClientError, type LoginResponse } from '@org/data-access';
import type { Login } from '@org/types';

interface LoginApiResponse {
  data: LoginResponse;
}

export function useLogin() {
  return useMutation<LoginApiResponse, ApiClientError, Login>({
    mutationFn: (data) =>
      apiClient.post<LoginApiResponse>('/auth/login', data),
  });
}
