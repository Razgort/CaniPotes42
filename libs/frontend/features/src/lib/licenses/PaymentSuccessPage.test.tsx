import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

const { mockUseStripePaymentStatus } = vi.hoisted(() => ({
  mockUseStripePaymentStatus: vi.fn(),
}));

vi.mock('./hooks/useLicenseTypes', () => ({
  useStripePaymentStatus: (sessionId: string | null) =>
    mockUseStripePaymentStatus(sessionId),
}));

const mockToastSuccess = vi.fn();
vi.mock('@org/ui', () => ({ toast: { success: (...args: unknown[]) => mockToastSuccess(...args) } }));

import { PaymentSuccessPage } from './PaymentSuccessPage';

function renderWithSessionId(sessionId: string | null) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const initialEntry = sessionId ? `/payment/success?session_id=${sessionId}` : '/payment/success';
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/payment/success" element={<PaymentSuccessPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('PaymentSuccessPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseStripePaymentStatus.mockReturnValue({ data: undefined });
  });

  it('renders spinner while payment status is pending', () => {
    mockUseStripePaymentStatus.mockReturnValue({ data: undefined });

    renderWithSessionId('sess_123');

    expect(screen.getByText('Paiement en cours de confirmation')).toBeTruthy();
    expect(document.querySelector('.animate-spin')).toBeTruthy();
  });

  it('calls useStripePaymentStatus with the session_id from URL', () => {
    renderWithSessionId('sess_abc');

    expect(mockUseStripePaymentStatus).toHaveBeenCalledWith('sess_abc');
  });

  it('shows toast and navigates to /licenses when status is COMPLETED', () => {
    mockUseStripePaymentStatus.mockReturnValue({ data: { data: { status: 'COMPLETED' } } });

    renderWithSessionId('sess_123');

    expect(mockToastSuccess).toHaveBeenCalledWith('Licence payée !');
    expect(mockNavigate).toHaveBeenCalledWith('/licenses', { replace: true });
  });

  it('shows failure UI when status is FAILED', () => {
    mockUseStripePaymentStatus.mockReturnValue({ data: { data: { status: 'FAILED' } } });

    renderWithSessionId('sess_123');

    expect(screen.getByText('Paiement échoué')).toBeTruthy();
    expect(screen.getByText('Réessayer')).toBeTruthy();
  });

  it('"Réessayer" button navigates back to /licenses', () => {
    mockUseStripePaymentStatus.mockReturnValue({ data: { data: { status: 'FAILED' } } });

    renderWithSessionId('sess_123');

    screen.getByText('Réessayer').closest('button')!.click();
    expect(mockNavigate).toHaveBeenCalledWith('/licenses', { replace: true });
  });
});
