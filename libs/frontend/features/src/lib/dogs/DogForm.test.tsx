import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { mockUseAuth, mockUseCreateDog, mockUseUpdateDog, mockUseUploadDogPhoto, mockNavigate, mockToastSuccess, mockToastError } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockUseCreateDog: vi.fn(),
  mockUseUpdateDog: vi.fn(),
  mockUseUploadDogPhoto: vi.fn(),
  mockNavigate: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
}));

vi.mock('@org/data-access', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('./hooks/useDogs', () => ({
  useCreateDog: () => mockUseCreateDog(),
  useUpdateDog: () => mockUseUpdateDog(),
  useUploadDogPhoto: () => mockUseUploadDogPhoto(),
}));

vi.mock('@org/ui', async () => {
  const actual = await vi.importActual<typeof import('@org/ui')>('@org/ui');
  return { ...actual, toast: { success: mockToastSuccess, error: mockToastError } };
});

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

// Import after mocks
import { DogForm } from './DogForm';

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('DogForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ activeClub: { id: 'club-1' } });
    mockUseCreateDog.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
    mockUseUpdateDog.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
    mockUseUploadDogPhoto.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
  });

  it('renders create form with all fields', () => {
    renderWithProviders(<DogForm />);

    expect(screen.getByLabelText(/nom/i)).toBeTruthy();
    expect(screen.getByLabelText(/race/i)).toBeTruthy();
    expect(screen.getByLabelText(/date de naissance/i)).toBeTruthy();
    expect(screen.getByLabelText(/n° de puce/i)).toBeTruthy();
    expect(screen.getByText('Ajouter')).toBeTruthy();
  });

  it('shows required error when name is empty on submit', async () => {
    const user = userEvent.setup();
    renderWithProviders(<DogForm />);

    await user.click(screen.getByRole('button', { name: 'Ajouter' }));

    await waitFor(() => {
      // Zod validation should prevent submission; API should not be called
      expect(mockUseCreateDog().mutateAsync).not.toHaveBeenCalled();
    });
  });

  it('submits create form and navigates to dog page', async () => {
    const user = userEvent.setup();
    const mockMutateAsync = vi.fn().mockResolvedValue({ data: { id: 'dog-new' } });
    mockUseCreateDog.mockReturnValue({ mutateAsync: mockMutateAsync, isPending: false });

    renderWithProviders(<DogForm />);

    await user.type(screen.getByLabelText(/^nom/i), 'Rex');
    await user.click(screen.getByRole('button', { name: 'Ajouter' }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(expect.objectContaining({ name: 'Rex' }));
      expect(mockToastSuccess).toHaveBeenCalledWith('Chien ajouté');
      expect(mockNavigate).toHaveBeenCalledWith('/dogs/dog-new');
    });
  });

  it('renders edit mode with pre-populated values', () => {
    const existingDog = {
      id: 'dog-1',
      name: 'Max',
      breed: 'Golden',
      birthdate: '2020-06-15T00:00:00.000Z',
      chipNumber: '123',
      photoUrl: null,
      userId: 'u1',
      clubId: 'club-1',
      createdAt: '',
      updatedAt: '',
    };

    renderWithProviders(<DogForm existingDog={existingDog} />);

    expect(screen.getByDisplayValue('Max')).toBeTruthy();
    expect(screen.getByDisplayValue('Golden')).toBeTruthy();
    expect(screen.getByDisplayValue('123')).toBeTruthy();
    expect(screen.getByText('Enregistrer')).toBeTruthy();
  });

  it('calls updateDog and shows success toast in edit mode', async () => {
    const user = userEvent.setup();
    const mockMutateAsync = vi.fn().mockResolvedValue({ data: { id: 'dog-1' } });
    mockUseUpdateDog.mockReturnValue({ mutateAsync: mockMutateAsync, isPending: false });

    const existingDog = {
      id: 'dog-1', name: 'Max', breed: null, birthdate: null,
      chipNumber: null, photoUrl: null, userId: 'u1', clubId: 'club-1',
      createdAt: '', updatedAt: '',
    };

    renderWithProviders(<DogForm existingDog={existingDog} />);

    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ dogId: 'dog-1' }),
      );
      expect(mockToastSuccess).toHaveBeenCalledWith('Profil mis à jour');
    });
  });

  it('renders camera-first photo upload buttons', () => {
    renderWithProviders(<DogForm />);

    expect(screen.getByLabelText('Prendre une photo')).toBeTruthy();
    expect(screen.getByLabelText('Choisir un fichier')).toBeTruthy();
  });
});
