import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { mockUseAuth, mockUseDogDetail, mockUseDeleteDog, mockUseVaccines, mockNavigate, mockToastSuccess, mockToastError } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockUseDogDetail: vi.fn(),
  mockUseDeleteDog: vi.fn(),
  mockUseVaccines: vi.fn(),
  mockNavigate: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
}));

vi.mock('@org/data-access', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('./hooks/useDogs', () => ({
  useDogDetail: (...args: unknown[]) => mockUseDogDetail(...args),
  useDeleteDog: () => mockUseDeleteDog(),
}));

vi.mock('./hooks/useVaccines', () => ({
  useVaccines: (...args: unknown[]) => mockUseVaccines(...args),
}));

vi.mock('./VaccineList', () => ({
  VaccineList: () => <div data-testid="vaccine-list" />,
}));

vi.mock('./VaccineForm', () => ({
  VaccineForm: () => <div data-testid="vaccine-form" />,
}));

vi.mock('./CertificateUpload', () => ({
  CertificateUpload: () => <div data-testid="certificate-upload" />,
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
import { DogDetail } from './DogDetail';

const mockDog = {
  id: 'dog-1',
  name: 'Rex',
  breed: 'Labrador',
  birthdate: '2020-01-15T00:00:00.000Z',
  chipNumber: '123456789',
  photoUrl: null,
  userId: 'user-1',
  clubId: 'club-1',
  createdAt: '',
  updatedAt: '',
  owner: undefined,
};

function renderWithProviders(ui: React.ReactElement, initialPath = '/dogs/dog-1') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/dogs/:dogId" element={ui} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('DogDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseDeleteDog.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
    mockUseVaccines.mockReturnValue({ data: [] });
  });

  it('displays dog name, breed, birthdate, and chip number', () => {
    mockUseAuth.mockReturnValue({ activeClub: { id: 'club-1' }, user: { id: 'user-1' } });
    mockUseDogDetail.mockReturnValue({ data: { data: mockDog }, isLoading: false });

    renderWithProviders(<DogDetail />);

    expect(screen.getByText('Rex')).toBeTruthy();
    expect(screen.getByText('Labrador')).toBeTruthy();
    expect(screen.getByText('123456789')).toBeTruthy();
  });

  it('shows edit and delete buttons for owner', () => {
    mockUseAuth.mockReturnValue({
      activeClub: { id: 'club-1' },
      user: { id: 'user-1' }, // matches dog.userId
    });
    mockUseDogDetail.mockReturnValue({ data: { data: mockDog }, isLoading: false });

    renderWithProviders(<DogDetail />);

    expect(screen.getByRole('button', { name: /modifier/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /retirer/i })).toBeTruthy();
  });

  it('hides edit and delete buttons for non-owner', () => {
    mockUseAuth.mockReturnValue({
      activeClub: { id: 'club-1' },
      user: { id: 'other-user' }, // different from dog.userId
    });
    mockUseDogDetail.mockReturnValue({ data: { data: mockDog }, isLoading: false });

    renderWithProviders(<DogDetail />);

    expect(screen.queryByRole('button', { name: /modifier/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /retirer/i })).toBeNull();
  });

  it('shows confirmation dialog when delete button clicked', async () => {
    const user = userEvent.setup();
    mockUseAuth.mockReturnValue({
      activeClub: { id: 'club-1' },
      user: { id: 'user-1' },
    });
    mockUseDogDetail.mockReturnValue({ data: { data: mockDog }, isLoading: false });

    renderWithProviders(<DogDetail />);

    await user.click(screen.getByRole('button', { name: /retirer/i }));

    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText(/Les carnets de vaccination/i)).toBeTruthy();
  });

  it('calls deleteDog and navigates on confirmation', async () => {
    const user = userEvent.setup();
    const mockMutateAsync = vi.fn().mockResolvedValue(undefined);
    mockUseDeleteDog.mockReturnValue({ mutateAsync: mockMutateAsync, isPending: false });
    mockUseAuth.mockReturnValue({
      activeClub: { id: 'club-1' },
      user: { id: 'user-1' },
    });
    mockUseDogDetail.mockReturnValue({ data: { data: mockDog }, isLoading: false });

    renderWithProviders(<DogDetail />);

    await user.click(screen.getByRole('button', { name: /retirer/i }));
    await user.click(screen.getByRole('button', { name: /supprimer/i }));

    expect(mockMutateAsync).toHaveBeenCalledWith({ dogId: 'dog-1' });
    expect(mockToastSuccess).toHaveBeenCalledWith('Chien retiré');
    expect(mockNavigate).toHaveBeenCalledWith('/dogs');
  });

  it('navigates to edit page when edit button clicked', async () => {
    const user = userEvent.setup();
    mockUseAuth.mockReturnValue({
      activeClub: { id: 'club-1' },
      user: { id: 'user-1' },
    });
    mockUseDogDetail.mockReturnValue({ data: { data: mockDog }, isLoading: false });

    renderWithProviders(<DogDetail />);

    await user.click(screen.getByRole('button', { name: /modifier/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/dogs/dog-1/edit');
  });
});
