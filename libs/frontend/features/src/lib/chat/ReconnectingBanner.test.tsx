import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReconnectingBanner } from './ReconnectingBanner';

describe('ReconnectingBanner', () => {
  it('renders banner with text when isReconnecting is true', () => {
    render(<ReconnectingBanner isReconnecting={true} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Reconnexion en cours...')).toBeInTheDocument();
  });

  it('renders nothing when isReconnecting is false', () => {
    const { container } = render(<ReconnectingBanner isReconnecting={false} />);
    expect(container.firstChild).toBeNull();
    expect(screen.queryByText('Reconnexion en cours...')).not.toBeInTheDocument();
  });

  it('has aria-live="polite" for screen reader accessibility', () => {
    render(<ReconnectingBanner isReconnecting={true} />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });
});
