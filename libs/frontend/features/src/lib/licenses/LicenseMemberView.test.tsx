import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { mockUseLicenseTypes, mockUseInitiateStripePayment, mockUseInitiateHelloAssoPayment } = vi.hoisted(() => ({
  mockUseLicenseTypes: vi.fn(),
  mockUseInitiateStripePayment: vi.fn(),
  mockUseInitiateHelloAssoPayment: vi.fn(),
}));

vi.mock('./hooks/useLicenseTypes', () => ({
  useLicenseTypes: (...args: unknown[]) => mockUseLicenseTypes(...args),
  useInitiateStripePayment: () => mockUseInitiateStripePayment(),
  useInitiateHelloAssoPayment: () => mockUseInitiateHelloAssoPayment(),
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

  beforeEach(() => {
    mockUseInitiateStripePayment.mockReturnValue({ mutate: vi.fn(), isPending: false });
    mockUseInitiateHelloAssoPayment.mockReturnValue({ mutate: vi.fn(), isPending: false });
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

  it('STRIPE "Payer par carte" button is enabled and calls initiateStripe.mutate on click', async () => {
    const mutate = vi.fn();
    mockUseInitiateStripePayment.mockReturnValue({ mutate, isPending: false });
    mockUseLicenseTypes.mockReturnValue({
      data: { data: [mockLicenseTypes[0]] },
      isLoading: false,
    });

    renderWithProviders(<LicenseMemberView clubId="club-1" />);

    const btn = screen.getByText('Payer par carte').closest('button') as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
    btn.click();
    expect(mutate).toHaveBeenCalledWith({ licenseTypeId: 'lt-1' });
  });

  it('STRIPE button shows "..." and is disabled while payment is pending', () => {
    mockUseInitiateStripePayment.mockReturnValue({ mutate: vi.fn(), isPending: true });
    mockUseLicenseTypes.mockReturnValue({
      data: { data: [mockLicenseTypes[0]] },
      isLoading: false,
    });

    renderWithProviders(<LicenseMemberView clubId="club-1" />);

    const btn = screen.getByText('...').closest('button') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('HELLOASSO "Payer via HelloAsso" button is enabled and calls initiateHelloAsso.mutate on click', async () => {
    const mutate = vi.fn();
    mockUseInitiateHelloAssoPayment.mockReturnValue({ mutate, isPending: false });
    mockUseLicenseTypes.mockReturnValue({
      data: { data: [mockLicenseTypes[1]] },
      isLoading: false,
    });

    renderWithProviders(<LicenseMemberView clubId="club-1" />);

    const btn = screen.getByText('Payer via HelloAsso').closest('button') as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
    btn.click();
    expect(mutate).toHaveBeenCalledWith({ licenseTypeId: 'lt-2' });
  });

  it('HELLOASSO button shows "..." and is disabled while payment is pending', () => {
    mockUseInitiateHelloAssoPayment.mockReturnValue({ mutate: vi.fn(), isPending: true });
    mockUseLicenseTypes.mockReturnValue({
      data: { data: [mockLicenseTypes[1]] },
      isLoading: false,
    });

    renderWithProviders(<LicenseMemberView clubId="club-1" />);

    const btn = screen.getByText('...').closest('button') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });
});
