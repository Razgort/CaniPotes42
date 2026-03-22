import { apiClient, ApiClientError, setTokenGetter } from './api-client';

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
  setTokenGetter(null as unknown as () => string | null);
});

describe('apiClient', () => {
  it('makes GET requests to the correct URL', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: 'test' }),
    });

    const result = await apiClient.get('/clubs');
    expect(mockFetch).toHaveBeenCalledWith('/api/clubs', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: undefined,
    });
    expect(result).toEqual({ data: 'test' });
  });

  it('makes POST requests with body', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { id: '1' } }),
    });

    await apiClient.post('/clubs', { name: 'Test Club' });
    expect(mockFetch).toHaveBeenCalledWith('/api/clubs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name: 'Test Club' }),
    });
  });

  it('injects auth header when token is available', async () => {
    setTokenGetter(() => 'my-token');
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    });

    await apiClient.get('/events');
    expect(mockFetch).toHaveBeenCalledWith('/api/events', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer my-token',
      },
      credentials: 'include',
      body: undefined,
    });
  });

  it('does not inject auth header when no token getter', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    });

    await apiClient.get('/public');
    const call = mockFetch.mock.calls[0];
    expect(call[1].headers).not.toHaveProperty('Authorization');
  });

  it('throws ApiClientError with French message on 400', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () =>
        Promise.resolve({
          statusCode: 400,
          error: 'VALIDATION_ERROR',
          message: 'Invalid data',
        }),
    });

    await expect(apiClient.post('/clubs', {})).rejects.toThrow(ApiClientError);
    try {
      await apiClient.post('/clubs', {});
    } catch {
      // re-mock for second call
    }

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () =>
        Promise.resolve({
          statusCode: 400,
          error: 'VALIDATION_ERROR',
        }),
    });

    try {
      await apiClient.post('/clubs', {});
    } catch (e) {
      const err = e as ApiClientError;
      expect(err.statusCode).toBe(400);
      expect(err.message).toBe(
        "Nous n'avons pas pu traiter votre demande."
      );
      expect(err.errorCode).toBe('VALIDATION_ERROR');
    }
  });

  it('throws ApiClientError with French message on 401', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: 'UNAUTHORIZED' }),
    });

    try {
      await apiClient.get('/protected');
    } catch (e) {
      const err = e as ApiClientError;
      expect(err.statusCode).toBe(401);
      expect(err.message).toBe(
        'Nous devons vous identifier. Veuillez vous connecter.'
      );
    }
  });

  it('throws with fallback message for unknown status', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 418,
      json: () => Promise.resolve({}),
    });

    try {
      await apiClient.get('/teapot');
    } catch (e) {
      const err = e as ApiClientError;
      expect(err.message).toBe('Une erreur inattendue est survenue.');
    }
  });

  it('makes PATCH requests', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { updated: true } }),
    });

    await apiClient.patch('/clubs/1', { name: 'Updated' });
    expect(mockFetch).toHaveBeenCalledWith('/api/clubs/1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name: 'Updated' }),
    });
  });

  it('makes DELETE requests', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: null }),
    });

    await apiClient.delete('/clubs/1');
    expect(mockFetch).toHaveBeenCalledWith('/api/clubs/1', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: undefined,
    });
  });
});
