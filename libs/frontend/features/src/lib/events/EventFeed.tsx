import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useAuth } from '@org/data-access';
import { DateGroupHeader, SkeletonCard } from '@org/ui';
import { useEvents } from './hooks/useEvents';
import { EventCard } from './components/EventCard';
import { groupEventsByDate } from './utils/groupEventsByDate';

type StatusFilter = undefined | 'DRAFT' | 'PUBLISHED';

const FILTER_OPTIONS = [
  { label: 'Tous', value: undefined },
  { label: 'Publiés', value: 'PUBLISHED' as const },
  { label: 'Brouillons', value: 'DRAFT' as const },
] as const;

export default function EventFeed() {
  const { role } = useAuth();
  const isAdmin = role === 'ADMIN' || role === 'OWNER';
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(undefined);

  const { events, isLoading, isError } = useEvents({
    status: isAdmin ? statusFilter : undefined,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 py-4" aria-hidden="true">
        {Array.from({ length: 5 }, (_, i) => (
          <SkeletonCard key={i} height={72} />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        Une erreur est survenue lors du chargement des événements.
      </div>
    );
  }

  const groups = groupEventsByDate(events);
  const isEmpty = events.length === 0;

  return (
    <div className="flex flex-col gap-0 lg:flex-row lg:gap-6">
      {/* Event list */}
      <div className="min-w-0 flex-1">
        {/* Admin filter chips */}
        {isAdmin && (
          <div className="flex gap-2 pb-3">
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => setStatusFilter(opt.value)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  statusFilter === opt.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {/* Empty state */}
        {isEmpty && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            {isAdmin ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Aucun événement pour le moment
                </p>
                <button
                  type="button"
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <Plus className="h-4 w-4" />
                  Créer votre premier événement
                </button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Les événements apparaîtront ici quand les admins les publieront
              </p>
            )}
          </div>
        )}

        {/* Grouped event list */}
        {!isEmpty && (
          <div className="flex flex-col gap-1">
            {groups.map((group) => (
              <div key={group.label}>
                <DateGroupHeader label={group.label} />
                <div className="flex flex-col gap-2 py-2">
                  {group.events.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Desktop map sidebar placeholder (Story 5.3) */}
      <div className="hidden lg:block lg:w-80 xl:w-96">
        <div className="sticky top-4 flex h-[calc(100vh-8rem)] items-center justify-center rounded-lg border bg-muted/30 text-sm text-muted-foreground">
          Carte à venir
        </div>
      </div>
    </div>
  );
}
