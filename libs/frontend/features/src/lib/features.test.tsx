import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider, QueryProvider } from '@org/data-access';
import { AppRoutes } from './features';

function renderWithRouter(initialEntries: string[] = ['/']) {
  return render(
    <QueryProvider>
      <AuthProvider>
        <MemoryRouter initialEntries={initialEntries}>
          <AppRoutes />
        </MemoryRouter>
      </AuthProvider>
    </QueryProvider>
  );
}

describe('AppRoutes', () => {
  it('redirects unauthenticated users to login at /', async () => {
    renderWithRouter(['/']);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Se connecter' })).toBeInTheDocument();
    });
  });

  it('renders login page at /login', async () => {
    renderWithRouter(['/login']);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Se connecter' })).toBeInTheDocument();
    });
  });

  it('renders NotFound page for unknown routes', async () => {
    renderWithRouter(['/unknown-route']);
    await waitFor(() => {
      expect(screen.getByText('Page non trouvée')).toBeInTheDocument();
    });
  });
});
