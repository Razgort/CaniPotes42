import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockUseAuth = vi.fn();
const mockUseDogs = vi.fn();
const mockNavigate = vi.fn();

vi.mock('@org/data-access', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('./hooks/useDogs', () => ({
  useDogs: (...args: unknown[]) => mockUseDogs(...args),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

// Import after mocks
import { DogList } from './DogList';

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('DogList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ activeClub: { id: 'club-1' } });
  });

  it('renders dog cards when dogs exist', () => {
    mockUseDogs.mockReturnValue({
      data: {
        data: [
          { id: 'dog-1', name: 'Rex', breed: 'Labrador', photoUrl: null, userId: 'u1', clubId: 'club-1', createdAt: '', updatedAt: '' },
        ],
        meta: { total: 1, page: 1, pageSize: 20 },
      },
      isLoading: false,
    });

    renderWithProviders(<DogList />);

    expect(screen.getByText('Rex')).toBeTruthy();
    expect(screen.getByText('Labrador')).toBeTruthy();
  });

  it('shows empty state with CTA when no dogs', () => {
    mockUseDogs.mockReturnValue({
      data: { data: [], meta: { total: 0, page: 1, pageSize: 20 } },
      isLoading: false,
    });

    renderWithProviders(<DogList />);

    expect(screen.getByText('Ajoutez votre premier chien pour commencer')).toBeTruthy();
    expect(screen.getByText('Ajouter un chien')).toBeTruthy();
  });

  it('navigates to /dogs/new when add button clicked', async () => {
    const user = userEvent.setup();
    mockUseDogs.mockReturnValue({
      data: { data: [], meta: { total: 0, page: 1, pageSize: 20 } },
      isLoading: false,
    });

    renderWithProviders(<DogList />);

    await user.click(screen.getByText('Ajouter un chien'));

    expect(mockNavigate).toHaveBeenCalledWith('/dogs/new');
  });

  it('navigates to dog detail when dog card clicked', async () => {
    const user = userEvent.setup();
    mockUseDogs.mockReturnValue({
      data: {
        data: [
          { id: 'dog-1', name: 'Rex', breed: null, photoUrl: null, userId: 'u1', clubId: 'club-1', createdAt: '', updatedAt: '' },
        ],
        meta: { total: 1, page: 1, pageSize: 20 },
      },
      isLoading: false,
    });

    renderWithProviders(<DogList />);

    await user.click(screen.getByRole('button', { name: 'Voir le profil de Rex' }));

    expect(mockNavigate).toHaveBeenCalledWith('/dogs/dog-1');
  });

  it('shows loading skeleton when isLoading is true', () => {
    mockUseDogs.mockReturnValue({ data: undefined, isLoading: true });

    renderWithProviders(<DogList />);

    // SkeletonList renders skeleton items; just verify DogList doesn't crash
    expect(screen.queryByText('Rex')).toBeNull();
    expect(screen.queryByText('Ajoutez votre premier chien pour commencer')).toBeNull();
  });
});
