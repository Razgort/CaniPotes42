import { createContext, useContext, type ReactNode } from 'react';

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

export interface AuthContextValue {
  user: User | null;
  accessToken: string | null;
  activeClub: Club | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  switchClub: (clubId: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const value: AuthContextValue = {
    user: null,
    accessToken: null,
    activeClub: null,
    role: null,
    isAuthenticated: false,
    switchClub: () => { /* placeholder for future implementation */ },
    logout: () => { /* placeholder for future implementation */ },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
