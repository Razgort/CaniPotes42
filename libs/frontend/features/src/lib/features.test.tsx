import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppRoutes } from './features';

function renderWithRouter(initialEntries: string[] = ['/']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AppRoutes />
    </MemoryRouter>
  );
}

describe('AppRoutes', () => {
  it('renders Home page at /', async () => {
    renderWithRouter(['/']);
    await waitFor(() => {
      expect(screen.getByText('Accueil')).toBeInTheDocument();
    });
  });

  it('renders NotFound page for unknown routes', async () => {
    renderWithRouter(['/unknown-route']);
    await waitFor(() => {
      expect(screen.getByText('Page non trouvée')).toBeInTheDocument();
    });
  });
});
