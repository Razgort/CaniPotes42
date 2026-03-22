import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { mockUseLicenseTypes, mockUseInitiateStripePayment } = vi.hoisted(() => ({
  mockUseLicenseTypes: vi.fn(),
  mockUseInitiateStripePayment: vi.fn(),
}));

vi.mock('./hooks/useLicenseTypes', () => ({
  useLicenseTypes: (...args: unknown[]) => mockUseLicenseTypes(...args),
  useInitiateStripePayment: () => mockUseInitiateStripePayment(),
}));

import { LicenseMemberView } from './LicenseMemberView';

const mockLicenseTypes = [
  {
    id: 'lt-1',
    clubId: 'club-1',
    name: 'Licence annuelle',
    amount: '50',
    season: '2025-2026',
    paymentProvider: 'STRIPE' as const,
    deletedAt: null,
    createdAt: '2026-03-22T00:00:00Z',
    updatedAt: '2026-03-22T00:00:00Z',
  },
  {
    id: 'lt-2',
    clubId: 'club-1',
    name: 'Pass journée',
    amount: '10',
    season: '2025-2026',
    paymentProvider: 'HELLOASSO' as const,
    deletedAt: null,
    createdAt: '2026-03-22T00:00:00Z',
    updatedAt: '2026-03-22T00:00:00Z',
  },
];

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('LicenseMemberView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state with skeleton cards', () => {
    mockUseLicenseTypes.mockReturnValue({ data: undefined, isLoading: true });

    renderWithProviders(<LicenseMemberView clubId="club-1" />);

    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBe(3);
  });

  it('renders empty state message', () => {
    mockUseLicenseTypes.mockReturnValue({ data: { data: [] }, isLoading: false });

    renderWithProviders(<LicenseMemberView clubId="club-1" />);

    expect(screen.getByText(/Aucun type de licence disponible/)).toBeTruthy();
  });

  it('renders license type cards with name, amount, season', () => {
    mockUseLicenseTypes.mockReturnValue({
      data: { data: mockLicenseTypes },
      isLoading: false,
    });

    renderWithProviders(<LicenseMemberView clubId="club-1" />);

    expect(screen.getByText('Licence annuelle')).toBeTruthy();
    expect(screen.getByText('Pass journée')).toBeTruthy();
    expect(screen.getByText('50 € · 2025-2026')).toBeTruthy();
    expect(screen.getByText('10 € · 2025-2026')).toBeTruthy();
  });

  it('renders provider badges', () => {
    mockUseLicenseTypes.mockReturnValue({
      data: { data: mockLicenseTypes },
      isLoading: false,
    });

    renderWithProviders(<LicenseMemberView clubId="club-1" />);

    expect(screen.getByText('Stripe')).toBeTruthy();
    expect(screen.getByText('HelloAsso')).toBeTruthy();
  });

  it('renders disabled "Payer" buttons (payment not yet implemented)', () => {
    mockUseLicenseTypes.mockReturnValue({
      data: { data: mockLicenseTypes },
      isLoading: false,
    });

    renderWithProviders(<LicenseMemberView clubId="club-1" />);

    const payButtons = screen.getAllByText('Payer');
    expect(payButtons.length).toBe(2);
    payButtons.forEach((btn) => {
      expect((btn.closest('button') as HTMLButtonElement).disabled).toBe(true);
    });
  });

  it('"Payer" button has tooltip explaining payment coming soon', () => {
    mockUseLicenseTypes.mockReturnValue({
      data: { data: [mockLicenseTypes[0]] },
      isLoading: false,
    });

    renderWithProviders(<LicenseMemberView clubId="club-1" />);

    const btn = screen.getByText('Payer').closest('button') as HTMLButtonElement;
    expect(btn.title).toBe('Paiement disponible prochainement');
  });
});
