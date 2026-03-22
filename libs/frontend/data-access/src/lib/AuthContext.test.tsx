import { render, screen, renderHook, act } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
});

describe('AuthContext', () => {
  it('throws when useAuth is used outside AuthProvider', () => {
    expect(() => renderHook(() => useAuth())).toThrow(
      'useAuth must be used within an AuthProvider'
    );
  });

  it('provides default null values inside AuthProvider', () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    expect(result.current.user).toBeNull();
    expect(result.current.accessToken).toBeNull();
    expect(result.current.activeClub).toBeNull();
    expect(result.current.role).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('provides switchClub and logout functions', () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    expect(typeof result.current.switchClub).toBe('function');
    expect(typeof result.current.logout).toBe('function');
  });

  it('renders children', () => {
    render(
      <AuthProvider>
        <span>child content</span>
      </AuthProvider>
    );
    expect(screen.getByText('child content')).toBeInTheDocument();
  });

  describe('login', () => {
    it('sets user, accessToken, and activeClub on login', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      act(() => {
        result.current.login({
          accessToken: 'token-abc',
          user: { id: '1', email: 'a@b.com', firstName: 'A', lastName: 'B', avatarUrl: null },
          activeClub: { id: 'c1', name: 'Club', role: 'OWNER' },
        });
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual({ id: '1', email: 'a@b.com', firstName: 'A', lastName: 'B' });
      expect(result.current.activeClub?.id).toBe('c1');
      expect(result.current.role).toBe('OWNER');
    });
  });

  describe('logout', () => {
    it('calls POST /auth/logout and clears auth state', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { message: 'ok' } }),
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // Login first
      act(() => {
        result.current.login({
          accessToken: 'token-abc',
          user: { id: '1', email: 'a@b.com', firstName: 'A', lastName: 'B', avatarUrl: null },
          activeClub: { id: 'c1', name: 'Club', role: 'OWNER' },
        });
      });

      expect(result.current.isAuthenticated).toBe(true);

      // Logout
      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.accessToken).toBeNull();

      // Verify POST /auth/logout was called
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/logout'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('clears auth state even if logout API call fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      act(() => {
        result.current.login({
          accessToken: 'token-abc',
          user: { id: '1', email: 'a@b.com', firstName: 'A', lastName: 'B', avatarUrl: null },
          activeClub: null,
        });
      });

      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
    });
  });
});
