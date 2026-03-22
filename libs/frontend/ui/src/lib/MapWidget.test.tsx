import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MapWidget, MapWidgetError, MapWidgetSkeleton } from './MapWidget';

// Mock leaflet for jsdom environment
vi.mock('leaflet', () => ({
  default: {
    map: vi.fn(() => ({
      remove: vi.fn(),
      addTo: vi.fn(),
    })),
    tileLayer: vi.fn(() => ({ addTo: vi.fn() })),
    marker: vi.fn(() => ({
      bindPopup: vi.fn().mockReturnThis(),
      addTo: vi.fn(),
    })),
    Icon: { Default: { mergeOptions: vi.fn() } },
  },
  map: vi.fn(() => ({ remove: vi.fn() })),
  tileLayer: vi.fn(() => ({ addTo: vi.fn() })),
  marker: vi.fn(() => ({ bindPopup: vi.fn().mockReturnThis(), addTo: vi.fn() })),
  Icon: { Default: { mergeOptions: vi.fn() } },
}));

describe('MapWidget', () => {
  it('renders map container with aria-hidden when coords provided', () => {
    render(<MapWidget latitude={48.8566} longitude={2.3522} />);

    const mapContainer = document.querySelector('[aria-hidden="true"]');
    expect(mapContainer).toBeTruthy();
  });

  it('renders sr-only fallback text with location name', () => {
    render(
      <MapWidget
        latitude={48.8566}
        longitude={2.3522}
        locationName="Stade de France"
      />,
    );

    const srText = document.querySelector('.sr-only');
    expect(srText?.textContent).toContain('Stade de France');
  });

  it('renders sr-only fallback text with coordinates when no location name', () => {
    render(<MapWidget latitude={48.8566} longitude={2.3522} />);

    const srText = document.querySelector('.sr-only');
    expect(srText?.textContent).toContain('48.8566');
  });

  it('returns null when latitude is null', () => {
    const { container } = render(
      <MapWidget latitude={null} longitude={2.3522} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('returns null when longitude is null', () => {
    const { container } = render(
      <MapWidget latitude={48.8566} longitude={null} />,
    );
    expect(container.firstChild).toBeNull();
  });
});

describe('MapWidgetError', () => {
  it('shows "Carte indisponible" message', () => {
    render(<MapWidgetError latitude={48.8566} longitude={2.3522} />);

    expect(screen.getByText('Carte indisponible')).toBeTruthy();
  });

  it('shows location name when provided', () => {
    render(
      <MapWidgetError
        latitude={48.8566}
        longitude={2.3522}
        locationName="Parking du stade"
      />,
    );

    expect(screen.getByText('Parking du stade')).toBeTruthy();
  });

  it('shows coordinates as text fallback', () => {
    render(<MapWidgetError latitude={48.85660} longitude={2.35220} />);

    expect(screen.getByText(/48\.85660|2\.35220/)).toBeTruthy();
  });

  it('does not show coordinates section when both are null', () => {
    render(<MapWidgetError latitude={null} longitude={null} />);

    // No coordinates text shown
    expect(screen.queryByText(/\d+\.\d+,/)).toBeNull();
  });
});

describe('MapWidgetSkeleton', () => {
  it('renders a skeleton placeholder', () => {
    const { container } = render(<MapWidgetSkeleton />);
    const skeleton = container.querySelector('[aria-hidden="true"]');
    expect(skeleton).toBeTruthy();
  });
});
