import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell, Toaster } from '@org/ui';
import { AppRoutes, useChatUnread } from '@org/features';
import { AuthProvider, QueryProvider, useAuth } from '@org/data-access';

function AppContent() {
  const { clubs, activeClub, role, isAuthenticated, switchClub, refreshClubs } = useAuth();
  const navigate = useNavigate();
  const unreadChatCount = useChatUnread();

  useEffect(() => {
    if (isAuthenticated) {
      refreshClubs();
    }
  }, [isAuthenticated, refreshClubs]);

  return (
    <AppShell
      clubs={clubs}
      activeClubId={activeClub?.id ?? null}
      role={role}
      onSwitchClub={isAuthenticated ? switchClub : undefined}
      onJoinClub={isAuthenticated ? () => navigate('/join') : undefined}
      unreadChatCount={unreadChatCount}
    >
      <Toaster />
      <AppRoutes />
    </AppShell>
  );
}

export function App() {
  return (
    <QueryProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </QueryProvider>
  );
}

export default App;
