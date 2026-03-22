import { groupEventsByDate } from './groupEventsByDate';

const makeEvent = (date: string, overrides = {}) => ({
  id: `event-${date}`,
  title: `Event on ${date}`,
  description: null,
  date,
  dateTime: date,
  latitude: 45.0,
  longitude: 4.0,
  locationName: null,
  status: 'PUBLISHED' as const,
  createdById: 'user-1',
  participantCount: 0,
  myRsvpStatus: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

describe('groupEventsByDate', () => {
  const now = new Date('2026-03-23T10:00:00.000Z'); // Monday

  it('groups events happening today as "Aujourd\'hui"', () => {
    const events = [makeEvent('2026-03-23T14:00:00.000Z')];
    const groups = groupEventsByDate(events, now);

    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe("Aujourd'hui");
    expect(groups[0].events).toHaveLength(1);
  });

  it('groups events happening tomorrow as "Demain"', () => {
    const events = [makeEvent('2026-03-24T10:00:00.000Z')];
    const groups = groupEventsByDate(events, now);

    expect(groups[0].label).toBe('Demain');
  });

  it('groups events this week as "Cette semaine"', () => {
    // Wed of same week
    const events = [makeEvent('2026-03-25T10:00:00.000Z')];
    const groups = groupEventsByDate(events, now);

    expect(groups[0].label).toBe('Cette semaine');
  });

  it('groups events next week as "Semaine prochaine"', () => {
    // Next Monday
    const events = [makeEvent('2026-03-30T10:00:00.000Z')];
    const groups = groupEventsByDate(events, now);

    expect(groups[0].label).toBe('Semaine prochaine');
  });

  it('uses absolute date for distant events', () => {
    const events = [makeEvent('2026-04-15T10:00:00.000Z')];
    const groups = groupEventsByDate(events, now);

    // Should be an absolute date in fr-FR format
    expect(groups[0].label).toMatch(/\w+ \d+ \w+/);
  });

  it('preserves event order within groups', () => {
    const events = [
      makeEvent('2026-03-23T09:00:00.000Z', { id: 'e1', title: 'Morning' }),
      makeEvent('2026-03-23T14:00:00.000Z', { id: 'e2', title: 'Afternoon' }),
    ];
    const groups = groupEventsByDate(events, now);

    expect(groups[0].events).toHaveLength(2);
    expect(groups[0].events[0].title).toBe('Morning');
    expect(groups[0].events[1].title).toBe('Afternoon');
  });

  it('creates multiple groups for different dates', () => {
    const events = [
      makeEvent('2026-03-23T10:00:00.000Z'),
      makeEvent('2026-03-24T10:00:00.000Z'),
    ];
    const groups = groupEventsByDate(events, now);

    expect(groups).toHaveLength(2);
    expect(groups[0].label).toBe("Aujourd'hui");
    expect(groups[1].label).toBe('Demain');
  });

  it('returns empty array for no events', () => {
    const groups = groupEventsByDate([], now);
    expect(groups).toEqual([]);
  });
});
