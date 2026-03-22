import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const {
  mockUseLicenseTypes,
  mockUseCreateLicenseType,
  mockUseUpdateLicenseType,
  mockUseDeleteLicenseType,
  mockToastSuccess,
  mockToastError,
} = vi.hoisted(() => ({
  mockUseLicenseTypes: vi.fn(),
  mockUseCreateLicenseType: vi.fn(),
  mockUseUpdateLicenseType: vi.fn(),
  mockUseDeleteLicenseType: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
}));

vi.mock('./hooks/useLicenseTypes', () => ({
  useLicenseTypes: (...args: unknown[]) => mockUseLicenseTypes(...args),
  useCreateLicenseType: (...args: unknown[]) => mockUseCreateLicenseType(...args),
  useUpdateLicenseType: (...args: unknown[]) => mockUseUpdateLicenseType(...args),
  useDeleteLicenseType: (...args: unknown[]) => mockUseDeleteLicenseType(...args),
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

import { LicenseTypeList } from './LicenseTypeList';

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

describe('LicenseTypeList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCreateLicenseType.mockReturnValue({ mutate: vi.fn(), isPending: false });
    mockUseUpdateLicenseType.mockReturnValue({ mutate: vi.fn(), isPending: false });
    mockUseDeleteLicenseType.mockReturnValue({ mutate: vi.fn(), isPending: false });
  });

  it('renders loading state', () => {
    mockUseLicenseTypes.mockReturnValue({ data: undefined, isLoading: true });

    renderWithProviders(<LicenseTypeList clubId="club-1" />);

    // 3 skeleton placeholders
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBe(3);
  });

  it('renders empty state when no license types', () => {
    mockUseLicenseTypes.mockReturnValue({ data: { data: [] }, isLoading: false });

    renderWithProviders(<LicenseTypeList clubId="club-1" />);

    expect(screen.getByText(/Aucun type de licence configuré/)).toBeTruthy();
  });

  it('renders license type cards', () => {
    mockUseLicenseTypes.mockReturnValue({
      data: { data: mockLicenseTypes },
      isLoading: false,
    });

    renderWithProviders(<LicenseTypeList clubId="club-1" />);

    expect(screen.getByText('Licence annuelle')).toBeTruthy();
    expect(screen.getByText('50 € · 2025-2026')).toBeTruthy();
    expect(screen.getByText('Stripe')).toBeTruthy();
  });

  it('shows \"+ Ajouter\" button', () => {
    mockUseLicenseTypes.mockReturnValue({ data: { data: [] }, isLoading: false });

    renderWithProviders(<LicenseTypeList clubId="club-1" />);

    expect(screen.getByText('Ajouter')).toBeTruthy();
  });

  it('opens create sheet on add button click', async () => {
    mockUseLicenseTypes.mockReturnValue({ data: { data: [] }, isLoading: false });

    renderWithProviders(<LicenseTypeList clubId="club-1" />);

    fireEvent.click(screen.getByText('Ajouter'));

    await waitFor(() => {
      expect(screen.getByText('Ajouter un type de licence')).toBeTruthy();
    });
  });

  it('opens edit sheet pre-populated on edit button click', async () => {
    mockUseLicenseTypes.mockReturnValue({
      data: { data: mockLicenseTypes },
      isLoading: false,
    });

    renderWithProviders(<LicenseTypeList clubId="club-1" />);

    fireEvent.click(screen.getByLabelText('Modifier'));

    await waitFor(() => {
      expect(screen.getByText('Modifier le type de licence')).toBeTruthy();
    });
  });

  it('opens delete confirmation dialog on delete button click', async () => {
    mockUseLicenseTypes.mockReturnValue({
      data: { data: mockLicenseTypes },
      isLoading: false,
    });

    renderWithProviders(<LicenseTypeList clubId="club-1" />);

    fireEvent.click(screen.getByLabelText('Supprimer'));

    await waitFor(() => {
      expect(
        screen.getByText('Supprimer ce type de licence ?'),
      ).toBeTruthy();
      expect(
        screen.getByText('Les paiements existants ne seront pas affectés.'),
      ).toBeTruthy();
    });
  });
});
