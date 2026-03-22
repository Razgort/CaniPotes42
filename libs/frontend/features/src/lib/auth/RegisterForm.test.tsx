import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RegisterForm } from './RegisterForm';

// Mock the useRegister hook
const mockMutateAsync = vi.fn();
vi.mock('./hooks/useRegister', () => ({
  useRegister: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));

// Mock the toast
vi.mock('@org/ui', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function renderForm() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <RegisterForm />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('RegisterForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders email, password, and privacy notice fields', () => {
    renderForm();

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/mot de passe/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/politique de confidentialite/i)).toBeInTheDocument();
  });

  it('validates email on blur', async () => {
    renderForm();

    const emailInput = screen.getByLabelText(/email/i);
    await userEvent.type(emailInput, 'invalid');
    fireEvent.blur(emailInput);

    await waitFor(() => {
      expect(screen.getByText(/invalid/i)).toBeInTheDocument();
    });
  });

  it('validates password minimum length on blur', async () => {
    renderForm();

    const passwordInput = screen.getByLabelText(/mot de passe/i);
    await userEvent.type(passwordInput, 'short');
    fireEvent.blur(passwordInput);

    await waitFor(() => {
      expect(screen.getByText(/8 characters/i)).toBeInTheDocument();
    });
  });

  it('requires privacy notice checkbox for submission', async () => {
    renderForm();

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/mot de passe/i);

    await userEvent.type(emailInput, 'test@example.com');
    await userEvent.type(passwordInput, 'password123');

    const submitButton = screen.getByRole('button', { name: /creer mon compte/i });
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/accepter la politique/i)).toBeInTheDocument();
    });

    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('preserves form input on error', async () => {
    const { ApiClientError } = await import('@org/data-access');
    mockMutateAsync.mockRejectedValue(
      new ApiClientError(409, 'CONFLICT', 'Email exists')
    );

    renderForm();

    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
    const passwordInput = screen.getByLabelText(/mot de passe/i) as HTMLInputElement;
    const privacyCheckbox = screen.getByLabelText(/politique de confidentialite/i);

    await userEvent.type(emailInput, 'test@example.com');
    await userEvent.type(passwordInput, 'password123');
    await userEvent.click(privacyCheckbox);

    const submitButton = screen.getByRole('button', { name: /creer mon compte/i });
    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(emailInput.value).toBe('test@example.com');
      expect(passwordInput.value).toBe('password123');
    });
  });

  it('auto-focuses email field on mount', () => {
    renderForm();

    const emailInput = screen.getByLabelText(/email/i);
    expect(document.activeElement).toBe(emailInput);
  });

  it('shows optional data checkbox as unchecked by default', () => {
    renderForm();

    const optionalCheckbox = screen.getByLabelText(/photos et communications/i) as HTMLInputElement;
    expect(optionalCheckbox.checked).toBe(false);
  });
});
