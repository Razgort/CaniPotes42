import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import EventDetail from './EventDetail';

// Mock hooks and UI deps
vi.mock('./hooks/useEventDetail', () => ({
  useEventDetail: vi.fn(),
}));

vi.mock('@org/ui', () => ({
  MapWidget: ({ latitude, longitude, locationName }: any) => (
    <div data-testid="map-widget" data-lat={latitude} data-lng={longitude}>
      {locationName}
    </div>
  ),
  MapWidgetError: ({ locationName }: any) => (
    <div data-testid="map-error">Carte indisponible{locationName && ` - ${locationName}`}</div>
  ),
  MapWidgetSkeleton: () => <div data-testid="map-skeleton" />,
  NavigateButton: ({ latitude, longitude }: any) => (
    <div data-testid="navigate-button" data-disabled={latitude === null}>
      {latitude !== null ? 'Navigate' : 'Disabled'}
    </div>
  ),
  SkeletonCard: () => <div data-testid="skeleton-card" />,
  SkeletonList: () => <div data-testid="skeleton-list" />,
  cn: (...args: string[]) => args.filter(Boolean).join(' '),
}));

const { useEventDetail } = await import('./hooks/useEventDetail');
const mockUseEventDetail = useEventDetail as ReturnType<typeof vi.fn>;

const mockEvent = {
  id: 'event-1',
  clubId: 'club-1',
  title: 'Course Agility',
  description: 'Grande course de compétition régionale',
  dateTime: '2026-06-15T09:00:00.000Z',
  latitude: 48.8566,
  longitude: 2.3522,
  locationName: 'Stade de France',
  status: 'PUBLISHED',
  createdById: 'user-1',
  participantCount: 12,
  myRsvpStatus: 'GOING',
  createdAt: '2026-03-22T00:00:00.000Z',
  updatedAt: '2026-03-22T00:00:00.000Z',
};

function renderEventDetail(eventId = 'event-1') {
  return render(
    <MemoryRouter initialEntries={[`/events/${eventId}`]}>
      <Routes>
        <Route path="/events/:eventId" element={<EventDetail />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('EventDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loading state', () => {
    it('shows skeleton placeholders while loading', () => {
      mockUseEventDetail.mockReturnValue({
        event: null,
        isLoading: true,
        isError: false,
      });

      renderEventDetail();

      expect(screen.getByTestId('map-skeleton')).toBeTruthy();
      expect(screen.getByTestId('skeleton-list')).toBeTruthy();
    });
  });

  describe('error state', () => {
    it('shows not found message on error', () => {
      mockUseEventDetail.mockReturnValue({
        event: null,
        isLoading: false,
        isError: true,
      });

      renderEventDetail();

      expect(screen.getByText(/trouvé cet événement/i)).toBeTruthy();
    });
  });

  describe('success state with GPS coordinates', () => {
    beforeEach(() => {
      mockUseEventDetail.mockReturnValue({
        event: mockEvent,
        isLoading: false,
        isError: false,
      });
    });

    it('renders event title as h1', () => {
      renderEventDetail();

      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading.textContent).toContain('Course Agility');
    });

    it('renders MapWidget with correct coordinates', () => {
      renderEventDetail();

      const map = screen.getByTestId('map-widget');
      expect(map.getAttribute('data-lat')).toBe('48.8566');
      expect(map.getAttribute('data-lng')).toBe('2.3522');
    });

    it('renders NavigateButton (enabled) when coordinates exist', () => {
      renderEventDetail();

      const nav = screen.getByTestId('navigate-button');
      expect(nav.getAttribute('data-disabled')).toBe('false');
      expect(nav.textContent).toContain('Navigate');
    });

    it('renders location name', () => {
      renderEventDetail();

      expect(screen.getByText('Stade de France')).toBeTruthy();
    });

    it('renders event description', () => {
      renderEventDetail();

      expect(screen.getByText('Grande course de compétition régionale')).toBeTruthy();
    });

    it('renders back button', () => {
      renderEventDetail();

      const backBtn = screen.getByRole('button', { name: /retour/i });
      expect(backBtn).toBeTruthy();
    });
  });

  describe('success state without GPS coordinates', () => {
    beforeEach(() => {
      mockUseEventDetail.mockReturnValue({
        event: { ...mockEvent, latitude: null, longitude: null },
        isLoading: false,
        isError: false,
      });
    });

    it('renders MapWidgetError instead of MapWidget', () => {
      renderEventDetail();

      expect(screen.getByTestId('map-error')).toBeTruthy();
      expect(screen.queryByTestId('map-widget')).toBeNull();
    });

    it('renders disabled NavigateButton', () => {
      renderEventDetail();

      const nav = screen.getByTestId('navigate-button');
      expect(nav.getAttribute('data-disabled')).toBe('true');
      expect(nav.textContent).toContain('Disabled');
    });
  });

  describe('draft event', () => {
    it('shows draft badge for draft events', () => {
      mockUseEventDetail.mockReturnValue({
        event: { ...mockEvent, status: 'DRAFT' },
        isLoading: false,
        isError: false,
      });

      renderEventDetail();

      expect(screen.getByText('Brouillon')).toBeTruthy();
    });
  });

  describe('past event', () => {
    it('shows past event banner for past dates', () => {
      mockUseEventDetail.mockReturnValue({
        event: { ...mockEvent, dateTime: '2020-01-01T09:00:00.000Z' },
        isLoading: false,
        isError: false,
      });

      renderEventDetail();

      expect(screen.getByText(/Événement passé/i)).toBeTruthy();
    });
  });
});
