import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { setTokenGetter, setTokenSetter, setOnUnauthorized, apiClient } from './api-client';
import { toast } from '@org/ui';
import { queryClient } from './QueryProvider';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface Club {
  id: string;
  name: string;
  logo?: string | null;
  federationType?: string | null;
}

export type UserRole = 'OWNER' | 'ADMIN' | 'MEMBER';

export interface LoginResponse {
  accessToken: string;
  user: User & { avatarUrl: string | null };
  activeClub: { id: string; name: string; role: UserRole } | null;
}

export interface ClubSessionUpdate {
  accessToken: string;
  club: { id: string; name: string };
  role: UserRole;
}

export interface ClubWithRole {
  clubId: string;
  name: string;
  logo: string | null;
  federationType: string | null;
  role: UserRole;
}

export interface AuthContextValue {
  user: User | null;
  accessToken: string | null;
  activeClub: Club | null;
  role: UserRole | null;
  clubs: ClubWithRole[];
  isAuthenticated: boolean;
  login: (data: LoginResponse) => void;
  logout: () => void;
  switchClub: (clubId: string) => Promise<void>;
  updateClubSession: (data: ClubSessionUpdate) => void;
  refreshClubs: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [activeClub, setActiveClub] = useState<Club | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [clubs, setClubs] = useState<ClubWithRole[]>([]);
  const sessionExpiredRef = useRef(false);

  const login = useCallback((data: LoginResponse) => {
    sessionExpiredRef.current = false;
    setUser({
      id: data.user.id,
      email: data.user.email,
      firstName: data.user.firstName,
      lastName: data.user.lastName,
    });
    setAccessToken(data.accessToken);
    // Même tick que setAuth — avant les useEffect enfants (ex. refreshClubs dans App).
    // Sans ça, tokenGetter peut encore renvoyer null → 401 sur /auth/my-clubs.
    setTokenGetter(() => data.accessToken);
    if (data.activeClub) {
      setActiveClub({ id: data.activeClub.id, name: data.activeClub.name });
      setRole(data.activeClub.role);
    } else {
      setActiveClub(null);
      setRole(null);
    }
  }, []);

  const updateClubSession = useCallback((data: ClubSessionUpdate) => {
    setAccessToken(data.accessToken);
    setTokenGetter(() => data.accessToken);
    setActiveClub({ id: data.club.id, name: data.club.name });
    setRole(data.role);
  }, []);

  const clearAuthState = useCallback(() => {
    setUser(null);
    setAccessToken(null);
    setActiveClub(null);
    setRole(null);
    setClubs([]);
    setTokenGetter(() => null);
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Best-effort: clear state even if server call fails
    }
    clearAuthState();
  }, [clearAuthState]);

  const handleSessionExpired = useCallback(() => {
    if (sessionExpiredRef.current) return;
    sessionExpiredRef.current = true;
    clearAuthState();
    toast.error('Votre session a expiré, veuillez vous reconnecter');
  }, [clearAuthState]);

  const refreshClubs = useCallback(async () => {
    try {
      const response = await apiClient.get<{ data: ClubWithRole[] }>('/auth/my-clubs');
      setClubs(response.data);
    } catch {
      // Silently fail — clubs list is non-critical
    }
  }, []);

  const switchClub = useCallback(async (clubId: string) => {
    const response = await apiClient.post<{
      data: {
        accessToken: string;
        activeClub: { id: string; name: string; logo: string | null; federationType: string | null };
        role: UserRole;
      };
    }>('/auth/switch-club', { clubId });

    const { accessToken: newToken, activeClub: newClub, role: newRole } = response.data;
    setAccessToken(newToken);
    setActiveClub({
      id: newClub.id,
      name: newClub.name,
      logo: newClub.logo,
      federationType: newClub.federationType,
    });
    setRole(newRole);

    // Clear all club-scoped query caches — stale data from previous club must never show
    queryClient.removeQueries();
  }, []);

  useEffect(() => {
    setTokenGetter(() => accessToken);
  }, [accessToken]);

  useEffect(() => {
    setTokenSetter((newToken: string) => {
      setAccessToken(newToken);
      setTokenGetter(() => newToken);
    });
  }, []);

  useEffect(() => {
    setOnUnauthorized(() => {
      handleSessionExpired();
    });
  }, [handleSessionExpired]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      accessToken,
      activeClub,
      role,
      clubs,
      isAuthenticated: !!accessToken,
      login,
      logout,
      switchClub,
      updateClubSession,
      refreshClubs,
    }),
    [user, accessToken, activeClub, role, clubs, login, logout, switchClub, updateClubSession, refreshClubs],
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
