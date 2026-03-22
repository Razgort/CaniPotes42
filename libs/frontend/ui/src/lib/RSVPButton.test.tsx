import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RSVPButton } from './RSVPButton';

describe('RSVPButton', () => {
  describe('full variant', () => {
    it('renders three options with radiogroup role', () => {
      render(<RSVPButton currentStatus={null} onSelect={vi.fn()} />);

      const group = screen.getByRole('radiogroup');
      expect(group).toBeInTheDocument();

      const radios = screen.getAllByRole('radio');
      expect(radios).toHaveLength(3);
    });

    it('renders the three correct labels', () => {
      render(<RSVPButton currentStatus={null} onSelect={vi.fn()} />);

      expect(screen.getByText("J'y vais")).toBeInTheDocument();
      expect(screen.getByText('Peut-être')).toBeInTheDocument();
      expect(screen.getByText('Je ne peux pas')).toBeInTheDocument();
    });

    it('marks the current selection as aria-checked', () => {
      render(<RSVPButton currentStatus="GOING" onSelect={vi.fn()} />);

      const goingButton = screen.getByRole('radio', { name: /j'y vais/i });
      expect(goingButton).toHaveAttribute('aria-checked', 'true');

      const maybeButton = screen.getByRole('radio', { name: /peut-être/i });
      expect(maybeButton).toHaveAttribute('aria-checked', 'false');
    });

    it('calls onSelect with the clicked status', () => {
      const onSelect = vi.fn();
      render(<RSVPButton currentStatus={null} onSelect={onSelect} />);

      fireEvent.click(screen.getByRole('radio', { name: /j'y vais/i }));
      expect(onSelect).toHaveBeenCalledWith('GOING');
    });

    it('calls onSelect when changing existing selection', () => {
      const onSelect = vi.fn();
      render(<RSVPButton currentStatus="GOING" onSelect={onSelect} />);

      fireEvent.click(screen.getByRole('radio', { name: /peut-être/i }));
      expect(onSelect).toHaveBeenCalledWith('MAYBE');
    });

    it('does not call onSelect when disabled', () => {
      const onSelect = vi.fn();
      render(<RSVPButton currentStatus={null} onSelect={onSelect} disabled />);

      fireEvent.click(screen.getByRole('radio', { name: /j'y vais/i }));
      expect(onSelect).not.toHaveBeenCalled();
    });

    it('marks buttons as disabled when disabled prop is true', () => {
      render(<RSVPButton currentStatus={null} onSelect={vi.fn()} disabled />);

      const radios = screen.getAllByRole('radio');
      radios.forEach((radio) => {
        expect(radio).toBeDisabled();
      });
    });
  });

  describe('compact variant', () => {
    it('renders a single button with status icon', () => {
      render(<RSVPButton currentStatus="GOING" onSelect={vi.fn()} compact />);

      const button = screen.getByRole('button', { name: /mon statut/i });
      expect(button).toBeInTheDocument();
    });

    it('shows dash when no status selected', () => {
      render(<RSVPButton currentStatus={null} onSelect={vi.fn()} compact />);

      const button = screen.getByRole('button', { name: /pas encore de réponse/i });
      expect(button).toBeInTheDocument();
    });

    it('is disabled when disabled prop is true', () => {
      render(<RSVPButton currentStatus="MAYBE" onSelect={vi.fn()} compact disabled />);

      expect(screen.getByRole('button')).toBeDisabled();
    });
  });
});
