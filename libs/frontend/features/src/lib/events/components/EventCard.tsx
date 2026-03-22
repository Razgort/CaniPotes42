import { Link } from 'react-router-dom';
import { Calendar, MapPin, Users } from 'lucide-react';
import { cn } from '@org/ui';
import type { EventResponse } from '@org/types';

interface EventCardProps {
  event: EventResponse;
}

function formatDateTime(isoDate: string): string {
  const date = new Date(isoDate);
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function getRsvpIndicator(status: string | null): string | null {
  switch (status) {
    case 'GOING':
      return '✓';
    case 'MAYBE':
      return '?';
    case 'NOT_GOING':
      return '✗';
    default:
      return null;
  }
}

export function EventCard({ event }: EventCardProps) {
  const dateStr = event.date ?? event.dateTime;
  const formattedDate = formatDateTime(dateStr);
  const rsvpIndicator = getRsvpIndicator(event.myRsvpStatus);
  const isDraft = event.status === 'DRAFT';

  return (
    <Link
      to={`/events/${event.id}`}
      className="block w-full rounded-lg border bg-card p-3 transition-colors hover:bg-accent/5"
      aria-label={`${event.title} - ${formattedDate}`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Calendar className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-medium">{event.title}</h3>
            {isDraft && (
              <span className="shrink-0 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
                Brouillon
              </span>
            )}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formattedDate}
            </span>

            {event.locationName && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                <span className="truncate max-w-[120px]">{event.locationName}</span>
              </span>
            )}

            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {event.participantCount}
            </span>

            {rsvpIndicator && (
              <span
                className={cn(
                  'flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold',
                  event.myRsvpStatus === 'GOING' && 'bg-green-100 text-green-700',
                  event.myRsvpStatus === 'MAYBE' && 'bg-yellow-100 text-yellow-700',
                  event.myRsvpStatus === 'NOT_GOING' && 'bg-red-100 text-red-700',
                )}
              >
                {rsvpIndicator}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
