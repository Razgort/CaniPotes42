import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { setTokenGetter, setOnUnauthorized } from './api-client';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface Club {
  id: string;
  name: string;
}

export type UserRole = 'OWNER' | 'ADMIN' | 'MEMBER';

export interface LoginResponse {
  accessToken: string;
  user: User & { avatarUrl: string | null };
  activeClub: { id: string; name: string; role: UserRole } | null;
}

export interface AuthContextValue {
  user: User | null;
  accessToken: string | null;
  activeClub: Club | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  login: (data: LoginResponse) => void;
  logout: () => void;
  switchClub: (clubId: string) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [activeClub, setActiveClub] = useState<Club | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);

  const login = useCallback((data: LoginResponse) => {
    setUser({
      id: data.user.id,
      email: data.user.email,
      firstName: data.user.firstName,
      lastName: data.user.lastName,
    });
    setAccessToken(data.accessToken);
    if (data.activeClub) {
      setActiveClub({ id: data.activeClub.id, name: data.activeClub.name });
      setRole(data.activeClub.role);
    } else {
      setActiveClub(null);
      setRole(null);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setAccessToken(null);
    setActiveClub(null);
    setRole(null);
  }, []);

  const switchClub = useCallback((_clubId: string) => {
    // Will be implemented in story 4.4
  }, []);

  useEffect(() => {
    setTokenGetter(() => accessToken);
  }, [accessToken]);

  useEffect(() => {
    setOnUnauthorized(() => {
      logout();
    });
  }, [logout]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      accessToken,
      activeClub,
      role,
      isAuthenticated: !!accessToken,
      login,
      logout,
      switchClub,
    }),
    [user, accessToken, activeClub, role, login, logout, switchClub],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
