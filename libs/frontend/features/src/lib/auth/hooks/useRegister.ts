import { useMutation } from '@tanstack/react-query';
import { apiClient, ApiClientError } from '@org/data-access';
import type { RegisterWithConsent } from './types';

interface RegisterResponse {
  data: {
    id: string;
    email: string;
    createdAt: string;
  };
}

export interface RegisterError {
  statusCode: number;
  errorCode: string;
  message: string;
}

export function useRegister() {
  return useMutation<RegisterResponse, ApiClientError, RegisterWithConsent>({
    mutationFn: (data) =>
      apiClient.post<RegisterResponse>('/auth/register', data),
  });
}

export type { RegisterWithConsent };
