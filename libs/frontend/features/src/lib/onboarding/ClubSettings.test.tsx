import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ClubSettings } from './ClubSettings';

const {
  mockClubData,
  mockUpdateMutateAsync,
  mockLogoMutateAsync,
  mockToastSuccess,
  mockToastError,
  mockNavigate,
} = vi.hoisted(() => ({
  mockClubData: {
    id: 'club-1',
    name: 'Club Canin',
    federation: 'FFSLC',
    logo: null,
    contactEmail: 'contact@club.fr',
    description: 'Un super club',
  },
  mockUpdateMutateAsync: vi.fn(),
  mockLogoMutateAsync: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
  mockNavigate: vi.fn(),
}));

vi.mock('./hooks/useClubSettings', () => ({
  useClubSettings: () => ({
    data: mockClubData,
    isLoading: false,
    error: null,
  }),
  useUpdateClubSettings: () => ({
    mutateAsync: mockUpdateMutateAsync,
    isPending: false,
  }),
  useUploadClubLogo: () => ({
    mutateAsync: mockLogoMutateAsync,
    isPending: false,
  }),
}));

vi.mock('@org/ui', async () => {
  const actual = await vi.importActual<typeof import('@org/ui')>('@org/ui');
  return {
    ...actual,
    toast: {
      success: mockToastSuccess,
      error: mockToastError,
    },
  };
});

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@org/data-access', async () => {
  const actual = await vi.importActual<typeof import('@org/data-access')>(
    '@org/data-access',
  );
  return {
    ...actual,
    useAuth: () => ({
      user: { id: 'user-1', email: 'test@test.fr', firstName: 'Jean', lastName: 'Dupont' },
      accessToken: 'mock-token',
      activeClub: { id: 'club-1', name: 'Club Canin' },
      role: 'OWNER' as const,
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      switchClub: vi.fn(),
      updateClubSession: vi.fn(),
      refreshClubs: vi.fn(),
      clubs: [],
    }),
    ApiClientError: actual.ApiClientError,
  };
});

function renderClubSettings() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/clubs/settings']}>
        <ClubSettings />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ClubSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the settings form with pre-populated data', async () => {
    renderClubSettings();

    await waitFor(() => {
      expect(screen.getByLabelText(/nom du club/i)).toHaveValue('Club Canin');
    });
    expect(screen.getByLabelText(/email de contact/i)).toHaveValue('contact@club.fr');
    expect(screen.getByLabelText(/description/i)).toHaveValue('Un super club');
  });

  it('renders federation radio options', () => {
    renderClubSettings();

    expect(screen.getByText('FFSLC')).toBeInTheDocument();
    expect(screen.getByText('CNEAC')).toBeInTheDocument();
    expect(screen.getByText('Autre')).toBeInTheDocument();
    expect(screen.getByText('Aucune')).toBeInTheDocument();
  });

  it('renders the submit button', () => {
    renderClubSettings();

    expect(screen.getByRole('button', { name: /enregistrer/i })).toBeInTheDocument();
  });

  it('shows success toast on successful update', async () => {
    const user = userEvent.setup();
    mockUpdateMutateAsync.mockResolvedValue({});
    renderClubSettings();

    await waitFor(() => {
      expect(screen.getByLabelText(/nom du club/i)).toHaveValue('Club Canin');
    });

    const nameInput = screen.getByLabelText(/nom du club/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'Nouveau Club');

    const submitButton = screen.getByRole('button', { name: /enregistrer/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockUpdateMutateAsync).toHaveBeenCalled();
    });

    expect(mockToastSuccess).toHaveBeenCalledWith('Parametres du club mis a jour');
  });

  it('renders logo section with change button', () => {
    renderClubSettings();

    expect(screen.getByText(/logo du club/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /changer le logo/i })).toBeInTheDocument();
  });

  it('renders page title', () => {
    renderClubSettings();

    expect(screen.getByText('Parametres du club')).toBeInTheDocument();
  });
});
