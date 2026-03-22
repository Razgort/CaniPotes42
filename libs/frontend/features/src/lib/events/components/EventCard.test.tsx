import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { EventCard } from './EventCard';

const mockEvent = {
  id: 'event-1',
  title: 'Balade en forêt',
  description: 'Promenade collective',
  date: '2026-04-01T10:00:00.000Z',
  dateTime: '2026-04-01T10:00:00.000Z',
  latitude: 45.44,
  longitude: 4.39,
  locationName: 'Parc du Pilat',
  status: 'PUBLISHED' as const,
  createdById: 'user-1',
  participantCount: 5,
  myRsvpStatus: 'GOING' as const,
  createdAt: '2026-03-20T08:00:00.000Z',
};

function renderCard(event = mockEvent) {
  return render(
    <MemoryRouter>
      <EventCard event={event} />
    </MemoryRouter>,
  );
}

describe('EventCard', () => {
  it('renders event title', () => {
    renderCard();
    expect(screen.getByText('Balade en forêt')).toBeInTheDocument();
  });

  it('renders participant count', () => {
    renderCard();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('renders location name', () => {
    renderCard();
    expect(screen.getByText('Parc du Pilat')).toBeInTheDocument();
  });

  it('renders draft badge for DRAFT events', () => {
    renderCard({ ...mockEvent, status: 'DRAFT' as const });
    expect(screen.getByText('Brouillon')).toBeInTheDocument();
  });

  it('does not render draft badge for PUBLISHED events', () => {
    renderCard();
    expect(screen.queryByText('Brouillon')).not.toBeInTheDocument();
  });

  it('renders as a link to event detail', () => {
    renderCard();
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/events/event-1');
  });

  it('has accessible aria-label with title and date', () => {
    renderCard();
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('aria-label', expect.stringContaining('Balade en forêt'));
  });
});
