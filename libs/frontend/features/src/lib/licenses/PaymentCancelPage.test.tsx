import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

import { PaymentCancelPage } from './PaymentCancelPage';

function renderWithProviders() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <PaymentCancelPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('PaymentCancelPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders cancel message', () => {
    renderWithProviders();

    expect(screen.getByText('Paiement annulé')).toBeTruthy();
    expect(screen.getByText('Paiement annulé. Vous pouvez réessayer à tout moment.')).toBeTruthy();
  });

  it('renders "Retour aux licences" button', () => {
    renderWithProviders();

    expect(screen.getByText('Retour aux licences')).toBeTruthy();
  });

  it('"Retour aux licences" button navigates to /licenses', () => {
    renderWithProviders();

    screen.getByText('Retour aux licences').closest('button')!.click();
    expect(mockNavigate).toHaveBeenCalledWith('/licenses', { replace: true });
  });
});
