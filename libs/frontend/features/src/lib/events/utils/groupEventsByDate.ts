import type { EventResponse } from '@org/types';

export interface EventGroup {
  label: string;
  events: EventResponse[];
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getISOWeekNumber(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const yearStart = new Date(d.getFullYear(), 0, 4);
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function getDateLabel(eventDate: Date, now: Date): string {
  const today = startOfDay(now);
  const eventDay = startOfDay(eventDate);

  const diffDays = Math.floor(
    (eventDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return 'Demain';

  const eventWeek = getISOWeekNumber(eventDate);
  const todayWeek = getISOWeekNumber(now);
  const sameYear = eventDate.getFullYear() === now.getFullYear();

  if (sameYear && eventWeek === todayWeek) return 'Cette semaine';
  if (sameYear && eventWeek === todayWeek + 1) return 'Semaine prochaine';

  // Absolute date: "Dimanche 23 mars"
  return eventDate.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export function groupEventsByDate(
  events: EventResponse[],
  now: Date = new Date(),
): EventGroup[] {
  const groups = new Map<string, EventResponse[]>();

  for (const event of events) {
    const label = getDateLabel(new Date(event.date ?? event.dateTime), now);
    const existing = groups.get(label);
    if (existing) {
      existing.push(event);
    } else {
      groups.set(label, [event]);
    }
  }

  return Array.from(groups.entries()).map(([label, events]) => ({
    label,
    events,
  }));
}
