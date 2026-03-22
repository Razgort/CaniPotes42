import { render, screen, renderHook } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';

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
    expect(() => result.current.switchClub('test-id')).not.toThrow();
    expect(() => result.current.logout()).not.toThrow();
  });

  it('renders children', () => {
    render(
      <AuthProvider>
        <span>child content</span>
      </AuthProvider>
    );
    expect(screen.getByText('child content')).toBeInTheDocument();
  });
});
