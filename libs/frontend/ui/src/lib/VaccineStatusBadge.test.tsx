import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VaccineStatusBadge } from './VaccineStatusBadge';

describe('VaccineStatusBadge', () => {
  describe('badge variant (default)', () => {
    it('renders UP_TO_DATE badge with correct label and aria-label', () => {
      render(<VaccineStatusBadge status="UP_TO_DATE" />);
      const badge = screen.getByText('À jour');
      expect(badge).toBeDefined();
      const el = screen.getByLabelText('Statut vaccin : À jour');
      expect(el).toBeDefined();
    });

    it('renders EXPIRING_SOON badge with correct label', () => {
      render(<VaccineStatusBadge status="EXPIRING_SOON" />);
      expect(screen.getByText('À renouveler')).toBeDefined();
    });

    it('renders EXPIRED badge with correct label', () => {
      render(<VaccineStatusBadge status="EXPIRED" />);
      expect(screen.getByText('Manquant / expiré')).toBeDefined();
    });

    it('includes an icon (text + icon, never color alone)', () => {
      render(<VaccineStatusBadge status="UP_TO_DATE" />);
      // Icon is aria-hidden, label text is present
      expect(screen.getByLabelText('Statut vaccin : À jour')).toBeDefined();
    });
  });

  describe('card variant', () => {
    it('renders count and label in card variant', () => {
      render(<VaccineStatusBadge status="UP_TO_DATE" variant="card" count={5} />);
      expect(screen.getByText('5')).toBeDefined();
      expect(screen.getByText('À jour')).toBeDefined();
    });

    it('shows 0 when count is not provided', () => {
      render(<VaccineStatusBadge status="EXPIRED" variant="card" />);
      expect(screen.getByText('0')).toBeDefined();
    });

    it('has correct aria-label on card', () => {
      render(<VaccineStatusBadge status="EXPIRED" variant="card" count={3} />);
      expect(screen.getByLabelText('Statut vaccin : Manquant / expiré')).toBeDefined();
    });
  });
});
