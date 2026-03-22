import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ClubRegistrationFlow } from './ClubRegistrationFlow';

const { mockMutateAsync, mockToastSuccess, mockToastError, mockNavigate, mockUpdateClubSession } =
  vi.hoisted(() => ({
    mockMutateAsync: vi.fn(),
    mockToastSuccess: vi.fn(),
    mockToastError: vi.fn(),
    mockNavigate: vi.fn(),
    mockUpdateClubSession: vi.fn(),
  }));

vi.mock('./hooks/useCreateClub', () => ({
  useCreateClub: () => ({
    mutateAsync: mockMutateAsync,
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
  const actual = await vi.importActual<typeof import('@org/data-access')>('@org/data-access');
  return {
    ...actual,
    useAuth: () => ({
      updateClubSession: mockUpdateClubSession,
      login: vi.fn(),
      logout: vi.fn(),
      user: { id: '1', email: 'test@example.com', firstName: 'Jean', lastName: 'Dupont' },
      accessToken: 'token-123',
      activeClub: null,
      role: null,
      isAuthenticated: true,
      switchClub: vi.fn(),
    }),
    queryClient: { invalidateQueries: vi.fn() },
  };
});

function renderFlow() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/clubs/new']}>
        <ClubRegistrationFlow />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('ClubRegistrationFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Step 1 (Club Name) initially', () => {
    renderFlow();
    expect(screen.getByRole('heading', { name: 'Nom du club' })).toBeInTheDocument();
    expect(screen.getByLabelText(/nom du club/i)).toBeInTheDocument();
  });

  it('shows validation error on blur when name is too short', async () => {
    const user = userEvent.setup();
    renderFlow();

    const nameInput = screen.getByLabelText(/nom du club/i);
    await user.type(nameInput, 'A');
    await user.tab();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/au moins 2 caracteres/);
    });
  });

  it('disables Continue when name is empty', () => {
    renderFlow();
    expect(screen.getByText('Continuer')).toBeDisabled();
  });

  it('navigates to Step 2 (Federation) on valid name', async () => {
    const user = userEvent.setup();
    renderFlow();

    await user.type(screen.getByLabelText(/nom du club/i), "Cani'potes 42");
    await user.click(screen.getByText('Continuer'));

    expect(screen.getByText('Federation')).toBeInTheDocument();
  });

  it('renders federation radio options in Step 2', async () => {
    const user = userEvent.setup();
    renderFlow();

    await user.type(screen.getByLabelText(/nom du club/i), "Cani'potes 42");
    await user.click(screen.getByText('Continuer'));

    expect(screen.getByText(/FFSLC/)).toBeInTheDocument();
    expect(screen.getByText(/CNEAC/)).toBeInTheDocument();
    expect(screen.getByText(/Autre federation/)).toBeInTheDocument();
    expect(screen.getByText(/Aucune affiliation/)).toBeInTheDocument();
  });

  it('navigates to Step 3 (Logo) after selecting federation', async () => {
    const user = userEvent.setup();
    renderFlow();

    await user.type(screen.getByLabelText(/nom du club/i), "Cani'potes 42");
    await user.click(screen.getByText('Continuer'));

    await user.click(screen.getByText(/FFSLC/));
    await user.click(screen.getByText('Continuer'));

    expect(screen.getByText('Logo du club')).toBeInTheDocument();
  });

  it('shows Skip button on logo step', async () => {
    const user = userEvent.setup();
    renderFlow();

    await user.type(screen.getByLabelText(/nom du club/i), "Cani'potes 42");
    await user.click(screen.getByText('Continuer'));
    await user.click(screen.getByText(/FFSLC/));
    await user.click(screen.getByText('Continuer'));

    expect(screen.getByText('Passer')).toBeInTheDocument();
  });

  it('navigates to Step 4 (Contact) when skipping logo', async () => {
    const user = userEvent.setup();
    renderFlow();

    await user.type(screen.getByLabelText(/nom du club/i), "Cani'potes 42");
    await user.click(screen.getByText('Continuer'));
    await user.click(screen.getByText(/FFSLC/));
    await user.click(screen.getByText('Continuer'));
    await user.click(screen.getByText('Passer'));

    expect(screen.getByText('Contact et description')).toBeInTheDocument();
  });

  it('preserves input when navigating back', async () => {
    const user = userEvent.setup();
    renderFlow();

    await user.type(screen.getByLabelText(/nom du club/i), "Cani'potes 42");
    await user.click(screen.getByText('Continuer'));

    // Now on Step 2, go back
    await user.click(screen.getByLabelText('Retour'));

    // Name should be preserved
    expect(screen.getByLabelText(/nom du club/i)).toHaveValue("Cani'potes 42");
  });

  it('shows email validation error on blur', async () => {
    const user = userEvent.setup();
    renderFlow();

    // Navigate to step 4
    await user.type(screen.getByLabelText(/nom du club/i), "Cani'potes 42");
    await user.click(screen.getByText('Continuer'));
    await user.click(screen.getByText(/FFSLC/));
    await user.click(screen.getByText('Continuer'));
    await user.click(screen.getByText('Passer'));

    const emailInput = screen.getByLabelText(/email de contact/i);
    await user.type(emailInput, 'not-an-email');
    await user.tab();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/email/i);
    });
  });

  it('renders description as optional', async () => {
    const user = userEvent.setup();
    renderFlow();

    await user.type(screen.getByLabelText(/nom du club/i), "Cani'potes 42");
    await user.click(screen.getByText('Continuer'));
    await user.click(screen.getByText(/FFSLC/));
    await user.click(screen.getByText('Continuer'));
    await user.click(screen.getByText('Passer'));

    expect(screen.getByText(/optionnel/i)).toBeInTheDocument();
  });

  it('submits form and shows success screen', async () => {
    const user = userEvent.setup();
    mockMutateAsync.mockResolvedValue({
      data: {
        id: 'club-1',
        name: "Cani'potes 42",
        federation: 'FFSLC',
        logo: null,
        contactEmail: 'contact@canipotes42.fr',
        description: null,
        createdAt: '2026-03-22T00:00:00Z',
        accessToken: 'new-token',
      },
    });

    renderFlow();

    // Step 1: Name
    await user.type(screen.getByLabelText(/nom du club/i), "Cani'potes 42");
    await user.click(screen.getByText('Continuer'));

    // Step 2: Federation
    await user.click(screen.getByText(/FFSLC/));
    await user.click(screen.getByText('Continuer'));

    // Step 3: Skip logo
    await user.click(screen.getByText('Passer'));

    // Step 4: Contact
    await user.type(screen.getByLabelText(/email de contact/i), 'contact@canipotes42.fr');
    await user.click(screen.getByText('Creer le club'));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        name: "Cani'potes 42",
        federation: 'FFSLC',
        contactEmail: 'contact@canipotes42.fr',
        description: undefined,
      });
    });

    await waitFor(() => {
      expect(screen.getByText(/club cree avec succes/i)).toBeInTheDocument();
      expect(screen.getByText(/Cani'potes 42/)).toBeInTheDocument();
    });
  });

  it('shows character counter for description', async () => {
    const user = userEvent.setup();
    renderFlow();

    await user.type(screen.getByLabelText(/nom du club/i), "Cani'potes 42");
    await user.click(screen.getByText('Continuer'));
    await user.click(screen.getByText(/FFSLC/));
    await user.click(screen.getByText('Continuer'));
    await user.click(screen.getByText('Passer'));

    expect(screen.getByText('0/500')).toBeInTheDocument();
  });

  it('renders progress dots showing correct step', async () => {
    renderFlow();
    const progressbar = screen.getByRole('progressbar');
    expect(progressbar).toBeInTheDocument();
    expect(progressbar).toHaveAttribute('aria-valuenow', '1');
    expect(progressbar).toHaveAttribute('aria-valuemax', '4');
  });
});
