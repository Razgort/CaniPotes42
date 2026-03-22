import { useMutation } from '@tanstack/react-query';
import { apiClient, ApiClientError, type LoginResponse } from '@org/data-access';
import type { Login } from '@org/types';

/** Toujours `{ data }` pour le formulaire — l’API peut renvoyer soit ça, soit le payload à plat. */
interface LoginApiResponse {
  data: LoginResponse;
}

function isLoginPayload(v: unknown): v is LoginResponse {
  return (
    typeof v === 'object' &&
    v !== null &&
    'accessToken' in v &&
    typeof (v as LoginResponse).accessToken === 'string'
  );
}

function normalizeLoginResponse(raw: unknown): LoginApiResponse {
  if (raw && typeof raw === 'object' && 'data' in raw && isLoginPayload((raw as LoginApiResponse).data)) {
    return raw as LoginApiResponse;
  }
  if (isLoginPayload(raw)) {
    return { data: raw };
  }
  throw new Error('Invalid login response shape');
}

export function useLogin() {
  return useMutation<LoginApiResponse, ApiClientError, Login>({
    mutationFn: async (credentials) => {
      const raw = await apiClient.post<unknown>('/auth/login', credentials);
      return normalizeLoginResponse(raw);
    },
  });
}
