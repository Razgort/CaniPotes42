import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { VaccineDashboard } from './VaccineDashboard';

// Mock dependencies
vi.mock('@org/data-access', () => ({
  useAuth: vi.fn(),
  apiClient: { get: vi.fn() },
  ApiClientError: class ApiClientError extends Error {},
}));

vi.mock('./hooks/useVaccineDashboard', () => ({
  useVaccineDashboard: vi.fn(),
}));

vi.mock('@org/ui', async () => {
  const actual = await vi.importActual('@org/ui');
  return {
    ...actual,
    VaccineStatusBadge: ({ status }: { status: string }) => (
      <span data-testid="vaccine-badge">{status}</span>
    ),
    VaccineSummaryCards: ({
      summary,
      onFilterChange,
    }: {
      summary: { ok: number; warning: number; critical: number };
      activeFilter: string | null;
      onFilterChange: (s: string | null) => void;
    }) => (
      <div data-testid="summary-cards">
        <span>{summary.ok} ok</span>
        <button type="button" data-testid="filter-expired" onClick={() => onFilterChange('EXPIRED')}>
          Filter expired
        </button>
        <button type="button" data-testid="clear-filter" onClick={() => onFilterChange(null)}>
          Clear
        </button>
      </div>
    ),
    SkeletonCard: () => <div data-testid="skeleton-card" />,
    SkeletonList: () => <div data-testid="skeleton-list" />,
    cn: (...args: string[]) => args.join(' '),
  };
});

import { useAuth } from '@org/data-access';
import { useVaccineDashboard } from './hooks/useVaccineDashboard';

const mockDog = {
  dogId: 'dog-1',
  dogName: 'Balto',
  dogPhotoUrl: null,
  ownerFirstName: 'Marie',
  ownerLastName: 'Dupont',
  memberId: 'member-1',
  overallStatus: 'EXPIRED',
  nextExpiryDate: null,
  daysUntilExpiry: null,
  vaccineRecords: [
    {
      id: 'v1',
      vaccineName: 'Rage',
      dateAdministered: '2025-01-01T00:00:00.000Z',
      expiryDate: '2025-06-01T00:00:00.000Z',
      status: 'EXPIRED',
      daysUntilExpiry: -100,
    },
  ],
};

function renderDashboard() {
  return render(
    <MemoryRouter>
      <VaccineDashboard />
    </MemoryRouter>,
  );
}

describe('VaccineDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({
      activeClub: { id: 'club-1' },
      role: 'ADMIN',
      user: { id: 'user-1' },
    });
  });

  it('shows loading skeleton while fetching', () => {
    (useVaccineDashboard as any).mockReturnValue({ isLoading: true, data: null, isError: false });
    renderDashboard();
    expect(screen.getAllByTestId('skeleton-card')).toHaveLength(3);
  });

  it('shows error message on fetch failure', () => {
    (useVaccineDashboard as any).mockReturnValue({ isLoading: false, data: null, isError: true });
    renderDashboard();
    expect(screen.getByText(/une erreur est survenue/i)).toBeDefined();
  });

  it('shows empty state when no dogs', () => {
    (useVaccineDashboard as any).mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        data: { summary: { ok: 0, warning: 0, critical: 0 }, dogs: [] },
        meta: { total: 0, page: 1, pageSize: 20 },
      },
    });
    renderDashboard();
    expect(screen.getByText(/aucun chien enregistré dans le club/i)).toBeDefined();
  });

  it('renders dog rows when data is available', () => {
    (useVaccineDashboard as any).mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        data: { summary: { ok: 0, warning: 0, critical: 1 }, dogs: [mockDog] },
        meta: { total: 1, page: 1, pageSize: 20 },
      },
    });
    renderDashboard();
    expect(screen.getAllByText('Balto')).toBeDefined();
    expect(screen.getAllByText(/Marie/)).toBeDefined();
  });

  it('shows summary cards', () => {
    (useVaccineDashboard as any).mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        data: { summary: { ok: 5, warning: 2, critical: 1 }, dogs: [mockDog] },
        meta: { total: 1, page: 1, pageSize: 20 },
      },
    });
    renderDashboard();
    expect(screen.getByTestId('summary-cards')).toBeDefined();
  });

  it('renders search input', () => {
    (useVaccineDashboard as any).mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        data: { summary: { ok: 0, warning: 0, critical: 1 }, dogs: [mockDog] },
        meta: { total: 1, page: 1, pageSize: 20 },
      },
    });
    renderDashboard();
    const searchInput = screen.getByPlaceholderText('Chien ou propriétaire…');
    expect(searchInput).toBeDefined();
  });

  it('opens detail drawer when dog row is clicked', () => {
    (useVaccineDashboard as any).mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        data: { summary: { ok: 0, warning: 0, critical: 1 }, dogs: [mockDog] },
        meta: { total: 1, page: 1, pageSize: 20 },
      },
    });
    renderDashboard();
    // Click on the mobile row (first one with vax-dash-row testid)
    const rows = screen.getAllByTestId('vax-dash-row');
    fireEvent.click(rows[0]);
    // Drawer should show dog name and vaccine records
    expect(screen.getByRole('dialog', { name: /détail vaccins de Balto/i })).toBeDefined();
    expect(screen.getByText('Rage')).toBeDefined();
  });

  it('shows access denied message for non-admin users', () => {
    (useAuth as any).mockReturnValue({ activeClub: { id: 'club-1' }, role: 'MEMBER', user: { id: 'user-1' } });
    (useVaccineDashboard as any).mockReturnValue({ isLoading: false, data: null, isError: false });
    renderDashboard();
    expect(screen.getByText(/accès réservé aux administrateurs/i)).toBeDefined();
  });
});
