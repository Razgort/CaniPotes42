import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LoginForm } from './LoginForm';
import { ApiClientError } from '@org/data-access';

const { mockMutateAsync, mockToastSuccess, mockToastError, mockNavigate, mockLogin } =
  vi.hoisted(() => ({
    mockMutateAsync: vi.fn(),
    mockToastSuccess: vi.fn(),
    mockToastError: vi.fn(),
    mockNavigate: vi.fn(),
    mockLogin: vi.fn(),
  }));

vi.mock('./hooks/useLogin', () => ({
  useLogin: () => ({
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
    useLocation: () => ({ pathname: '/login', state: null }),
  };
});

vi.mock('@org/data-access', async () => {
  const actual = await vi.importActual<typeof import('@org/data-access')>('@org/data-access');
  return {
    ...actual,
    useAuth: () => ({
      login: mockLogin,
      logout: vi.fn(),
      user: null,
      accessToken: null,
      activeClub: null,
      role: null,
      isAuthenticated: false,
      switchClub: vi.fn(),
    }),
  };
});

function renderLoginForm() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/login']}>
        <LoginForm />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders email and password fields with labels', () => {
    renderLoginForm();

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/mot de passe/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /se connecter/i })).toBeInTheDocument();
  });

  it('renders link to registration page', () => {
    renderLoginForm();

    expect(screen.getByText(/creer un compte/i)).toBeInTheDocument();
  });

  it('shows validation errors on blur with empty fields', async () => {
    const user = userEvent.setup();
    renderLoginForm();

    const emailInput = screen.getByLabelText(/email/i);
    await user.click(emailInput);
    await user.tab();

    await waitFor(() => {
      expect(screen.getByText(/invalid/i)).toBeInTheDocument();
    });
  });

  it('submits successfully and redirects to home when user has a club', async () => {
    const user = userEvent.setup();
    mockMutateAsync.mockResolvedValue({
      data: {
        accessToken: 'token-123',
        user: { id: '1', email: 'test@example.com', firstName: 'Jean', lastName: 'Dupont', avatarUrl: null },
        activeClub: { id: 'club-1', name: 'Club A', role: 'OWNER' },
      },
    });

    renderLoginForm();

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/mot de passe/i), 'password123');
    await user.click(screen.getByRole('button', { name: /se connecter/i }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(mockLogin).toHaveBeenCalled();
      expect(mockToastSuccess).toHaveBeenCalledWith('Connexion reussie');
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });
  });

  it('redirects to /club-setup when user has no clubs', async () => {
    const user = userEvent.setup();
    mockMutateAsync.mockResolvedValue({
      data: {
        accessToken: 'token-123',
        user: { id: '1', email: 'test@example.com', firstName: 'Jean', lastName: 'Dupont', avatarUrl: null },
        activeClub: null,
      },
    });

    renderLoginForm();

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/mot de passe/i), 'password123');
    await user.click(screen.getByRole('button', { name: /se connecter/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/club-setup', { replace: true });
    });
  });

  it('shows error toast on invalid credentials', async () => {
    const user = userEvent.setup();
    mockMutateAsync.mockRejectedValue(
      new ApiClientError(401, 'INVALID_CREDENTIALS', 'Invalid credentials')
    );

    renderLoginForm();

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/mot de passe/i), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: /se connecter/i }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Email ou mot de passe incorrect');
    });
  });

  it('preserves form input on API error', async () => {
    const user = userEvent.setup();
    mockMutateAsync.mockRejectedValue(
      new ApiClientError(401, 'INVALID_CREDENTIALS', 'Invalid credentials')
    );

    renderLoginForm();

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/mot de passe/i);

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'wrongpassword');
    await user.click(screen.getByRole('button', { name: /se connecter/i }));

    await waitFor(() => {
      expect(emailInput).toHaveValue('test@example.com');
      expect(passwordInput).toHaveValue('wrongpassword');
    });
  });
});
