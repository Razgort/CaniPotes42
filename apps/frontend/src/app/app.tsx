import { AppShell, Toaster } from '@org/ui';
import { AppRoutes } from '@org/features';
import { AuthProvider, QueryProvider } from '@org/data-access';

export function App() {
  return (
    <QueryProvider>
      <AuthProvider>
        <AppShell>
          <Toaster />
          <AppRoutes />
        </AppShell>
      </AuthProvider>
    </QueryProvider>
  );
}

export default App;
