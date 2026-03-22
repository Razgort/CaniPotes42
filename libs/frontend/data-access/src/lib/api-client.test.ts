import { apiClient, ApiClientError, setTokenGetter, setTokenSetter, setOnUnauthorized } from './api-client';

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
  setTokenGetter(null as unknown as () => string | null);
  setTokenSetter(null as unknown as (token: string) => void);
  setOnUnauthorized(null as unknown as () => void);
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

  it('throws ApiClientError with French message on 401 (no token)', async () => {
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

  describe('token refresh interceptor', () => {
    it('attempts refresh on 401 when token is present, then retries original request', async () => {
      let currentToken = 'expired-token';
      setTokenGetter(() => currentToken);
      setTokenSetter((t) => { currentToken = t; });

      // First call: 401
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'EXPIRED_TOKEN' }),
      });

      // Refresh call: success
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { accessToken: 'new-token' } }),
      });

      // Retry call: success
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { items: [] } }),
      });

      const result = await apiClient.get<{ data: { items: unknown[] } }>('/clubs');

      expect(result).toEqual({ data: { items: [] } });
      expect(mockFetch).toHaveBeenCalledTimes(3);

      // Verify refresh was called
      expect(mockFetch).toHaveBeenNthCalledWith(2,
        '/api/auth/refresh',
        expect.objectContaining({ method: 'POST', credentials: 'include' })
      );

      // Verify retry used new token
      expect(mockFetch).toHaveBeenNthCalledWith(3,
        '/api/clubs',
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Bearer new-token' }),
        })
      );
    });

    it('calls onUnauthorized when refresh fails', async () => {
      setTokenGetter(() => 'expired-token');
      const onUnauth = vi.fn();
      setOnUnauthorized(onUnauth);

      // First call: 401
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'EXPIRED_TOKEN' }),
      });

      // Refresh call: also fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'INVALID_REFRESH_TOKEN' }),
      });

      await expect(apiClient.get('/clubs')).rejects.toThrow(ApiClientError);
      expect(onUnauth).toHaveBeenCalled();
    });

    it('does not attempt refresh for auth/login endpoint', async () => {
      setTokenGetter(() => 'some-token');

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'INVALID_CREDENTIALS' }),
      });

      await expect(apiClient.post('/auth/login', { email: 'a@b.com', password: 'wrong' }))
        .rejects.toThrow(ApiClientError);

      // Should only have made 1 call (no refresh attempt)
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('does not attempt refresh when no token is present', async () => {
      // No token getter set

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'UNAUTHORIZED' }),
      });

      await expect(apiClient.get('/clubs')).rejects.toThrow(ApiClientError);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('queues concurrent requests during refresh', async () => {
      let currentToken = 'expired-token';
      setTokenGetter(() => currentToken);
      setTokenSetter((t) => { currentToken = t; });

      // Both requests get 401
      mockFetch.mockResolvedValueOnce({
        ok: false, status: 401,
        json: () => Promise.resolve({ error: 'EXPIRED' }),
      });
      mockFetch.mockResolvedValueOnce({
        ok: false, status: 401,
        json: () => Promise.resolve({ error: 'EXPIRED' }),
      });

      // One refresh call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { accessToken: 'refreshed-token' } }),
      });

      // Two retry calls
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: 'result-a' }),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: 'result-b' }),
      });

      const [resultA, resultB] = await Promise.all([
        apiClient.get('/endpoint-a'),
        apiClient.get('/endpoint-b'),
      ]);

      expect(resultA).toEqual({ data: 'result-a' });
      expect(resultB).toEqual({ data: 'result-b' });

      // Count refresh calls — should only be 1 refresh, not 2
      const refreshCalls = mockFetch.mock.calls.filter(
        (call) => typeof call[0] === 'string' && call[0].includes('/auth/refresh')
      );
      expect(refreshCalls.length).toBe(1);
    });
  });
});
