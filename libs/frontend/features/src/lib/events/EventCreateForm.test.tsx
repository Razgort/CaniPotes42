import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import EventCreateForm from './EventCreateForm';
import { useCreateEvent } from './hooks/useEventMutations';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockMutateAsync = vi.fn();
vi.mock('./hooks/useEventMutations', () => ({
  useCreateEvent: vi.fn(() => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  })),
}));

vi.mock('@org/ui', () => ({
  MapWidgetEditor: ({ onLocationChange }: any) => (
    <div data-testid="map-editor">
      <button
        data-testid="place-pin"
        onClick={() => onLocationChange(45.4397, 4.3872, 'Parc de Montaud')}
      >
        Place Pin
      </button>
    </div>
  ),
  MapWidgetError: () => <div data-testid="map-error">Carte indisponible</div>,
}));

function renderForm() {
  return render(
    <MemoryRouter>
      <EventCreateForm />
    </MemoryRouter>,
  );
}

describe('EventCreateForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all required form fields', () => {
    renderForm();
    expect(screen.getByLabelText(/titre/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/date et heure/i)).toBeInTheDocument();
    expect(screen.getByTestId('map-editor')).toBeInTheDocument();
  });

  it('shows "Nouvel événement" header', () => {
    renderForm();
    expect(screen.getByText('Nouvel événement')).toBeInTheDocument();
  });

  it('has a back button', () => {
    renderForm();
    expect(screen.getByLabelText('Retour')).toBeInTheDocument();
  });

  it('navigates back on back button click', () => {
    renderForm();
    fireEvent.click(screen.getByLabelText('Retour'));
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it('renders map editor for pin placement', () => {
    renderForm();
    expect(screen.getByTestId('map-editor')).toBeInTheDocument();
  });

  it('updates coordinates when pin is placed on map', async () => {
    renderForm();
    fireEvent.click(screen.getByTestId('place-pin'));
    // locationName should appear
    await waitFor(() => {
      expect(screen.getByText('Parc de Montaud')).toBeInTheDocument();
    });
  });

  it('shows manual input fallback when toggled', () => {
    renderForm();
    fireEvent.click(screen.getByText('Saisie manuelle'));
    expect(screen.getByTestId('map-error')).toBeInTheDocument();
    expect(screen.getByLabelText(/latitude/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/longitude/i)).toBeInTheDocument();
  });

  it('submits form and navigates to event detail', async () => {
    mockMutateAsync.mockResolvedValue({ data: { id: 'new-event-123' } });
    renderForm();

    // Fill required fields using input event (triggers RHF register onChange)
    fireEvent.input(screen.getByLabelText(/titre/i), {
      target: { value: 'Canitrail training' },
    });
    fireEvent.input(screen.getByLabelText(/date et heure/i), {
      target: { value: '2026-04-15T09:00' },
    });

    // Place pin (sets lat/lng via setValue)
    fireEvent.click(screen.getByTestId('place-pin'));

    // Wait for coordinates
    await waitFor(() => {
      expect(screen.getByText('Parc de Montaud')).toBeInTheDocument();
    });

    // Submit via form submission
    const form = screen.getByText("Créer l'événement").closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/events/new-event-123');
    });
  });

  it('submit button is disabled while mutation is pending', () => {
    vi.mocked(useCreateEvent).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: true,
    } as any);
    renderForm();
    expect(screen.getByRole('button', { name: /création en cours/i })).toBeDisabled();
  });
});
