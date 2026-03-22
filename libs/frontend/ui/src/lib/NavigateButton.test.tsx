import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NavigateButton } from './NavigateButton';

describe('NavigateButton', () => {
  describe('when coordinates are provided', () => {
    it('renders Waze navigation link with correct deep link URL', () => {
      render(<NavigateButton latitude={48.8566} longitude={2.3522} />);

      const wazeLink = screen.getByRole('link', { name: /Waze/i });
      expect(wazeLink).toBeTruthy();
      expect(wazeLink.getAttribute('href')).toBe(
        'waze://?ll=48.8566,2.3522&navigate=yes',
      );
    });

    it('renders Google Maps navigation link with correct URL', () => {
      render(<NavigateButton latitude={48.8566} longitude={2.3522} />);

      const gmapsLink = screen.getByRole('link', { name: /Google Maps/i });
      expect(gmapsLink).toBeTruthy();
      expect(gmapsLink.getAttribute('href')).toBe(
        'https://www.google.com/maps/dir/?api=1&destination=48.8566,2.3522',
      );
    });

    it('includes location name in aria-label when provided', () => {
      render(
        <NavigateButton
          latitude={48.8566}
          longitude={2.3522}
          locationName="Stade de France"
        />,
      );

      const wazeLink = screen.getByRole('link', { name: /Stade de France.*Waze/i });
      expect(wazeLink).toBeTruthy();
    });

    it('links have minimum height of 48px (touch target)', () => {
      render(<NavigateButton latitude={48.8566} longitude={2.3522} />);

      const wazeLink = screen.getByRole('link', { name: /Waze/i });
      // Check class includes min-h-[48px]
      expect(wazeLink.className).toContain('min-h-[48px]');
    });

    it('Google Maps link opens in new tab', () => {
      render(<NavigateButton latitude={48.8566} longitude={2.3522} />);

      const gmapsLink = screen.getByRole('link', { name: /Google Maps/i });
      expect(gmapsLink.getAttribute('target')).toBe('_blank');
      expect(gmapsLink.getAttribute('rel')).toContain('noopener');
    });
  });

  describe('when coordinates are null', () => {
    it('renders a disabled button when latitude is null', () => {
      render(<NavigateButton latitude={null} longitude={2.3522} />);

      const button = screen.getByRole('button');
      expect(button).toBeTruthy();
      expect(button).toBeDisabled();
    });

    it('renders a disabled button when longitude is null', () => {
      render(<NavigateButton latitude={48.8566} longitude={null} />);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('disabled button has accessible label indicating no GPS', () => {
      render(<NavigateButton latitude={null} longitude={null} />);

      const button = screen.getByRole('button');
      expect(button.getAttribute('aria-label')).toContain('GPS');
    });

    it('disabled button has muted styling', () => {
      render(<NavigateButton latitude={null} longitude={null} />);

      const button = screen.getByRole('button');
      expect(button.className).toContain('cursor-not-allowed');
    });
  });
});
