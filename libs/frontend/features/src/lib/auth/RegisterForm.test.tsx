import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RegisterForm } from './RegisterForm';
import { ApiClientError } from '@org/data-access';

const { mockMutateAsync, mockToastSuccess, mockToastError, mockNavigate } =
  vi.hoisted(() => ({
    mockMutateAsync: vi.fn(),
    mockToastSuccess: vi.fn(),
    mockToastError: vi.fn(),
    mockNavigate: vi.fn(),
  }));

vi.mock('./hooks/useRegister', () => ({
  useRegister: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));

vi.mock('@org/ui', () => ({
  toast: {
    success: mockToastSuccess,
    error: mockToastError,
  },
}));

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
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders email, password, and privacy notice fields', () => {
    renderForm();

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/mot de passe/i)).toBeInTheDocument();
    expect(
      screen.getByLabelText(/politique de confidentialite/i)
    ).toBeInTheDocument();
  });

  it('validates email on blur', async () => {
    renderForm();

    const emailInput = screen.getByLabelText(/email/i);
    await user.type(emailInput, 'invalid');
    await user.tab(); // triggers blur

    await waitFor(() => {
      const errorMessages = screen.getAllByRole('paragraph').filter((el) =>
        el.classList.contains('text-danger')
      );
      expect(errorMessages.length).toBeGreaterThan(0);
    });
  });

  it('validates password minimum length on blur', async () => {
    renderForm();

    const passwordInput = screen.getByLabelText(/mot de passe/i);
    await user.type(passwordInput, 'short');
    await user.tab(); // triggers blur

    await waitFor(() => {
      expect(screen.getByText(/8 characters/i)).toBeInTheDocument();
    });
  });

  it('does not submit when privacy notice is unchecked', async () => {
    renderForm();

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/mot de passe/i);

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');

    const submitButton = screen.getByRole('button', {
      name: /creer mon compte/i,
    });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockMutateAsync).not.toHaveBeenCalled();
    });
  });

  it('submits successfully when all fields are valid', async () => {
    mockMutateAsync.mockResolvedValue({
      data: { id: 'uuid-1', email: 'test@example.com', createdAt: '2026-03-22' },
    });

    renderForm();

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/mot de passe/i), 'password123');
    await user.click(
      screen.getByLabelText(/politique de confidentialite/i)
    );

    await user.click(
      screen.getByRole('button', { name: /creer mon compte/i })
    );

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@example.com',
          password: 'password123',
          acceptPrivacyNotice: true,
          acceptOptionalData: false,
        })
      );
    });

    expect(mockToastSuccess).toHaveBeenCalledWith(
      'Votre compte a ete cree avec succes'
    );
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('preserves form input on API error', async () => {
    mockMutateAsync.mockRejectedValue(
      new ApiClientError(409, 'CONFLICT', 'Email exists')
    );

    renderForm();

    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
    const passwordInput = screen.getByLabelText(
      /mot de passe/i
    ) as HTMLInputElement;

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(
      screen.getByLabelText(/politique de confidentialite/i)
    );
    await user.click(
      screen.getByRole('button', { name: /creer mon compte/i })
    );

    await waitFor(() => {
      expect(emailInput.value).toBe('test@example.com');
      expect(passwordInput.value).toBe('password123');
    });
  });

  it('shows optional data checkbox as unchecked by default', () => {
    renderForm();

    const optionalCheckbox = screen.getByLabelText(
      /photos et communications/i
    ) as HTMLInputElement;
    expect(optionalCheckbox.checked).toBe(false);
  });
});
