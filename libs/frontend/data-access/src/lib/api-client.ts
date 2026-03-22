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

export function setTokenGetter(fn: () => string | null) {
  tokenGetter = fn;
}

function getErrorMessage(status: number, serverMessage?: string): string {
  return (
    ERROR_MESSAGES[status] ||
    serverMessage ||
    'Une erreur inattendue est survenue.'
  );
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
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let errorBody: {
      statusCode?: number;
      error?: string;
      message?: string;
      details?: Record<string, string[]>;
    } = {};
    try {
      errorBody = await response.json() as typeof errorBody;
    } catch {
      // response body is not JSON
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
  patch: <T>(endpoint: string, body?: unknown) =>
    request<T>('PATCH', endpoint, body),
  delete: <T>(endpoint: string) => request<T>('DELETE', endpoint),
};
