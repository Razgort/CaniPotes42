import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const {
  mockCreateVaccine,
  mockUpdateVaccine,
  mockToastSuccess,
  mockToastError,
} = vi.hoisted(() => ({
  mockCreateVaccine: vi.fn(),
  mockUpdateVaccine: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
}));

vi.mock('./hooks/useVaccines', () => ({
  useCreateVaccine: () => ({ mutateAsync: mockCreateVaccine, isPending: false }),
  useUpdateVaccine: () => ({ mutateAsync: mockUpdateVaccine, isPending: false }),
}));

vi.mock('@org/ui', async () => {
  const actual = await vi.importActual<typeof import('@org/ui')>('@org/ui');
  return { ...actual, toast: { success: mockToastSuccess, error: mockToastError } };
});

import { VaccineForm } from './VaccineForm';

const mockVaccine = {
  id: 'vax-1',
  dogId: 'dog-1',
  vaccineName: 'Rage',
  dateAdministered: '2024-01-15T00:00:00.000Z',
  expiryDate: '2025-01-15T00:00:00.000Z',
  certificateUrl: null,
  status: 'UP_TO_DATE' as const,
  createdAt: '',
  updatedAt: '',
};

function renderForm(props: Partial<React.ComponentProps<typeof VaccineForm>> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const defaults = {
    clubId: 'club-1',
    dogId: 'dog-1',
    dogName: 'Rex',
    onSuccess: vi.fn(),
    onCancel: vi.fn(),
  };
  return render(
    <QueryClientProvider client={queryClient}>
      <VaccineForm {...defaults} {...props} />
    </QueryClientProvider>,
  );
}

describe('VaccineForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders add form with dog name in title', () => {
    renderForm();
    expect(screen.getByText(/Ajouter un vaccin.*Rex/i)).toBeTruthy();
  });

  it('renders edit form title when existingVaccine provided', () => {
    renderForm({ existingVaccine: mockVaccine });
    expect(screen.getByText(/Modifier le vaccin/i)).toBeTruthy();
  });

  it('pre-fills fields when editing', () => {
    renderForm({ existingVaccine: mockVaccine });
    expect((screen.getByLabelText(/Nom du vaccin/i) as HTMLInputElement).value).toBe('Rage');
  });

  it('calls onCancel when Annuler clicked', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    renderForm({ onCancel });
    await user.click(screen.getByRole('button', { name: /annuler/i }));
    expect(onCancel).toHaveBeenCalled();
  });

  it('creates vaccine and calls onSuccess on valid submit', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    const createdVaccine = { ...mockVaccine, id: 'vax-new' };
    mockCreateVaccine.mockResolvedValue(createdVaccine);
    renderForm({ onSuccess });

    await user.type(screen.getByLabelText(/Nom du vaccin/i), 'DHPP');
    fireEvent.change(screen.getByLabelText(/Date d'administration/i), { target: { value: '2024-03-01' } });
    fireEvent.change(screen.getByLabelText(/Date d'expiration/i), { target: { value: '2025-03-01' } });
    await user.click(screen.getByRole('button', { name: /enregistrer/i }));

    await waitFor(() => {
      expect(mockCreateVaccine).toHaveBeenCalledWith(
        expect.objectContaining({ vaccineName: 'DHPP' }),
      );
      expect(mockToastSuccess).toHaveBeenCalledWith('Vaccin ajouté');
      expect(onSuccess).toHaveBeenCalledWith(createdVaccine);
    });
  });

  it('updates vaccine and calls onSuccess on valid submit when editing', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    const updatedVaccine = { ...mockVaccine, vaccineName: 'Rage updated' };
    mockUpdateVaccine.mockResolvedValue(updatedVaccine);
    renderForm({ existingVaccine: mockVaccine, onSuccess });

    const nameInput = screen.getByLabelText(/Nom du vaccin/i) as HTMLInputElement;
    await user.clear(nameInput);
    await user.type(nameInput, 'Rage updated');
    await user.click(screen.getByRole('button', { name: /mettre à jour/i }));

    await waitFor(() => {
      expect(mockUpdateVaccine).toHaveBeenCalledWith(
        expect.objectContaining({ vaccineId: 'vax-1' }),
      );
      expect(mockToastSuccess).toHaveBeenCalledWith('Vaccin mis à jour');
      expect(onSuccess).toHaveBeenCalledWith(updatedVaccine);
    });
  });

  it('shows error toast when create fails', async () => {
    const user = userEvent.setup();
    mockCreateVaccine.mockRejectedValue(new Error('Network error'));
    renderForm();

    await user.type(screen.getByLabelText(/Nom du vaccin/i), 'DHPP');
    fireEvent.change(screen.getByLabelText(/Date d'administration/i), { target: { value: '2024-03-01' } });
    fireEvent.change(screen.getByLabelText(/Date d'expiration/i), { target: { value: '2025-03-01' } });
    await user.click(screen.getByRole('button', { name: /enregistrer/i }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalled();
    });
  });
});
