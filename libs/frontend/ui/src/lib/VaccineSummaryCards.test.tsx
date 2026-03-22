import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VaccineSummaryCards } from './VaccineSummaryCards';

const summary = { ok: 10, warning: 3, critical: 2 };

describe('VaccineSummaryCards', () => {
  it('renders three cards with correct counts', () => {
    render(
      <VaccineSummaryCards summary={summary} activeFilter={null} onFilterChange={() => {}} />,
    );
    expect(screen.getByText('10')).toBeDefined();
    expect(screen.getByText('3')).toBeDefined();
    expect(screen.getByText('2')).toBeDefined();
  });

  it('has region role and aria-label for accessibility', () => {
    render(
      <VaccineSummaryCards summary={summary} activeFilter={null} onFilterChange={() => {}} />,
    );
    expect(screen.getByRole('region', { name: 'Synthèse vaccinale' })).toBeDefined();
  });

  it('each card has a correct aria-label', () => {
    render(
      <VaccineSummaryCards summary={summary} activeFilter={null} onFilterChange={() => {}} />,
    );
    expect(screen.getByLabelText(/10 chiens À jour, appuyez pour filtrer/)).toBeDefined();
    expect(screen.getByLabelText(/3 chiens À renouveler, appuyez pour filtrer/)).toBeDefined();
    expect(screen.getByLabelText(/2 chiens Manquant \/ expiré, appuyez pour filtrer/)).toBeDefined();
  });

  it('calls onFilterChange with status when card is clicked', () => {
    const onFilterChange = vi.fn();
    render(
      <VaccineSummaryCards summary={summary} activeFilter={null} onFilterChange={onFilterChange} />,
    );
    fireEvent.click(screen.getByTestId('vax-dash-summary-bad'));
    expect(onFilterChange).toHaveBeenCalledWith('EXPIRED');
  });

  it('calls onFilterChange with null when active card is clicked again (toggle off)', () => {
    const onFilterChange = vi.fn();
    render(
      <VaccineSummaryCards
        summary={summary}
        activeFilter="EXPIRED"
        onFilterChange={onFilterChange}
      />,
    );
    fireEvent.click(screen.getByTestId('vax-dash-summary-bad'));
    expect(onFilterChange).toHaveBeenCalledWith(null);
  });

  it('shows aria-pressed=true on active filter card', () => {
    render(
      <VaccineSummaryCards
        summary={summary}
        activeFilter="UP_TO_DATE"
        onFilterChange={() => {}}
      />,
    );
    const okCard = screen.getByTestId('vax-dash-summary-ok');
    expect(okCard.getAttribute('aria-pressed')).toBe('true');
  });

  it('shows aria-pressed=false on inactive cards', () => {
    render(
      <VaccineSummaryCards
        summary={summary}
        activeFilter="UP_TO_DATE"
        onFilterChange={() => {}}
      />,
    );
    const badCard = screen.getByTestId('vax-dash-summary-bad');
    expect(badCard.getAttribute('aria-pressed')).toBe('false');
  });
});
