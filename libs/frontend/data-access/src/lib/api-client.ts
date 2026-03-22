const API_BASE_URL =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL
    ? import.meta.env.VITE_API_URL
    : '/api';

const ERROR_MESSAGES: Record<number, string> = {
  400: "Nous n'avons pas pu traiter votre demande.",
  401: 'Nous devons vous identifier. Veuillez vous connecter.',
  403: "Nous ne pouvons pas vous autoriser à accéder à cette ressource.",
  404: "Nous n'avons pas trouvé ce que vous cherchez.",
  409: 'Nous avons détecté un conflit avec les données existantes.',
  422: "Nous n'avons pas pu valider les données fournies.",
  500: 'Nous rencontrons un problème technique. Veuillez réessayer.',
};

export class ApiClientError extends Error {
  constructor(
    public statusCode: number,
    public errorCode: string,
    message: string,
    public details?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

let tokenGetter: (() => string | null) | null = null;
let tokenSetter: ((token: string) => void) | null = null;
let onUnauthorized: (() => void) | null = null;

export function setTokenGetter(fn: () => string | null) {
  tokenGetter = fn;
}

export function setTokenSetter(fn: (token: string) => void) {
  tokenSetter = fn;
}

export function setOnUnauthorized(fn: () => void) {
  onUnauthorized = fn;
}

function getErrorMessage(status: number, serverMessage?: string): string {
  return (
    ERROR_MESSAGES[status] ||
    serverMessage ||
    'Une erreur inattendue est survenue.'
  );
}

// Token refresh queue state
let isRefreshing = false;
let refreshQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: Error) => void;
}> = [];

function processQueue(error: Error | null, token: string | null) {
  for (const pending of refreshQueue) {
    if (error) {
      pending.reject(error);
    } else {
      pending.resolve(token!);
    }
  }
  refreshQueue = [];
}

async function attemptTokenRefresh(): Promise<string> {
  if (isRefreshing) {
    return new Promise<string>((resolve, reject) => {
      refreshQueue.push({ resolve, reject });
    });
  }

  isRefreshing = true;

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new ApiClientError(
        response.status,
        'REFRESH_FAILED',
        'Token refresh failed'
      );
    }

    const body = (await response.json()) as { data?: { accessToken: string }; accessToken?: string };
    const newToken = body.data?.accessToken ?? body.accessToken;

    if (!newToken) {
      throw new ApiClientError(401, 'REFRESH_FAILED', 'No access token in refresh response');
    }

    tokenSetter?.(newToken);
    processQueue(null, newToken);
    return newToken;
  } catch (error) {
    processQueue(error as Error, null);
    throw error;
  } finally {
    isRefreshing = false;
  }
}

async function request<T>(
  method: string,
  endpoint: string,
  body?: unknown
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const token = tokenGetter?.();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers,
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    // On 401 with a token, attempt transparent refresh (skip for auth endpoints)
    if (
      response.status === 401 &&
      tokenGetter?.() &&
      endpoint !== '/auth/refresh' &&
      endpoint !== '/auth/login'
    ) {
      try {
        const newToken = await attemptTokenRefresh();

        // Retry original request with new token
        const retryHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${newToken}`,
        };

        const retryResponse = await fetch(`${API_BASE_URL}${endpoint}`, {
          method,
          headers: retryHeaders,
          credentials: 'include',
          body: body ? JSON.stringify(body) : undefined,
        });

        if (!retryResponse.ok) {
          let retryErrorBody: {
            statusCode?: number;
            error?: string;
            message?: string;
            details?: Record<string, string[]>;
          } = {};
          try {
            retryErrorBody = (await retryResponse.json()) as typeof retryErrorBody;
          } catch {
            // not JSON
          }

          if (retryResponse.status === 401) {
            onUnauthorized?.();
          }

          throw new ApiClientError(
            retryResponse.status,
            retryErrorBody.error || 'UNKNOWN_ERROR',
            getErrorMessage(retryResponse.status, retryErrorBody.message),
            retryErrorBody.details
          );
        }

        return retryResponse.json() as Promise<T>;
      } catch (refreshError) {
        if (refreshError instanceof ApiClientError && refreshError.statusCode === 401) {
          onUnauthorized?.();
        } else if (!(refreshError instanceof ApiClientError)) {
          onUnauthorized?.();
        }
        throw refreshError;
      }
    }

    let errorBody: {
      statusCode?: number;
      error?: string;
      message?: string;
      details?: Record<string, string[]>;
    } = {};
    try {
      errorBody = (await response.json()) as typeof errorBody;
    } catch {
      // response body is not JSON
    }

    if (response.status === 401 && tokenGetter?.()) {
      onUnauthorized?.();
    }

    throw new ApiClientError(
      response.status,
      errorBody.error || 'UNKNOWN_ERROR',
      getErrorMessage(response.status, errorBody.message),
      errorBody.details
    );
  }

  return response.json() as Promise<T>;
}

export const apiClient = {
  get: <T>(endpoint: string) => request<T>('GET', endpoint),
  post: <T>(endpoint: string, body?: unknown) =>
    request<T>('POST', endpoint, body),
  put: <T>(endpoint: string, body?: unknown) =>
    request<T>('PUT', endpoint, body),
  patch: <T>(endpoint: string, body?: unknown) =>
    request<T>('PATCH', endpoint, body),
  delete: <T>(endpoint: string) => request<T>('DELETE', endpoint),
};
