import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin } from 'lucide-react';
import { MapWidget, MapWidgetError, MapWidgetSkeleton, NavigateButton, RSVPButton, SkeletonCard, SkeletonList } from '@org/ui';
import { useEventDetail, useRsvpMutation } from './hooks/useEventDetail';
import { ParticipantList } from './ParticipantList';
import { EventAdminActions } from './components/EventAdminActions';

function formatEventDateTime(isoDate: string): string {
  const date = new Date(isoDate);
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function isPastEvent(isoDate: string): boolean {
  return new Date(isoDate) < new Date();
}

export default function EventDetail() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { event, isLoading, isError } = useEventDetail(eventId);
  const rsvpMutation = useRsvpMutation(eventId ?? '');

  if (isLoading) {
    return (
      <div className="flex flex-col">
        {/* Header skeleton */}
        <div className="flex items-center gap-3 p-4 border-b">
          <div className="h-9 w-9 rounded-lg bg-border/50 animate-pulse" aria-hidden="true" />
          <SkeletonCard height={24} className="w-48" />
        </div>
        {/* Map skeleton */}
        <MapWidgetSkeleton className="m-4" />
        {/* Content skeleton */}
        <div className="p-4 space-y-3">
          <SkeletonList count={4} />
        </div>
      </div>
    );
  }

  if (isError || !event) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center gap-3">
        <p className="text-muted-foreground">
          Nous n&apos;avons pas trouvé cet événement.
        </p>
        <button
          type="button"
          onClick={() => navigate('/events')}
          className="text-sm font-medium text-primary underline"
        >
          Retour aux événements
        </button>
      </div>
    );
  }

  const dateStr = event.dateTime ?? (event as any).date;
  const hasCoords = event.latitude !== null && event.longitude !== null;
  const past = dateStr ? isPastEvent(dateStr) : false;

  return (
    <div className="flex flex-col min-h-0">
      {/* Header with back button */}
      <header className="flex items-center gap-3 p-4 border-b sticky top-0 bg-background z-10">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Retour"
          className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-base font-semibold truncate flex-1">{event.title}</h1>
        {event.status === 'DRAFT' && (
          <span
            className="shrink-0 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700"
            aria-label="Admin uniquement, non publié"
          >
            Brouillon
          </span>
        )}
      </header>

      {/* Admin actions bar */}
      <div className="px-4 py-3 border-b bg-muted/30">
        <EventAdminActions eventId={event.id} status={event.status} />
      </div>

      {/* Main content — responsive: stacked on mobile, side-by-side on md+ */}
      <div className="flex flex-col md:flex-row md:gap-6 md:p-6">
        {/* Left: Map + Navigate (above fold on mobile) */}
        <div className="md:w-1/2 md:shrink-0">
          {hasCoords ? (
            <>
              <MapWidget
                latitude={event.latitude}
                longitude={event.longitude}
                locationName={event.locationName}
                className="m-4 md:m-0 md:rounded-xl"
              />
              {/* NavigateButton — hero CTA, visible above fold */}
              <div className="px-4 pb-4 md:px-0 md:mt-3">
                <NavigateButton
                  latitude={event.latitude}
                  longitude={event.longitude}
                  locationName={event.locationName}
                />
              </div>
            </>
          ) : (
            <>
              <div className="mx-4 mt-4 md:mx-0 md:mt-0">
                <MapWidgetError
                  latitude={null}
                  longitude={null}
                  locationName={event.locationName}
                />
              </div>
              <div className="px-4 pb-4 md:px-0 md:mt-3">
                <NavigateButton latitude={null} longitude={null} />
              </div>
              {event.locationName && (
                <p className="px-4 pb-2 text-xs text-muted-foreground md:px-0">
                  Pas de point GPS pour cet événement — le lieu indiqué ci-dessus fait foi.
                </p>
              )}
            </>
          )}
        </div>

        {/* Right: Event info */}
        <div className="flex flex-col gap-4 px-4 pb-6 md:flex-1 md:px-0 md:pb-0">
          {/* Past event banner */}
          {past && (
            <div className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
              Événement passé
            </div>
          )}

          {/* Date & time */}
          {dateStr && (
            <div className="flex items-start gap-2 text-sm">
              <Calendar className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
              <span>{formatEventDateTime(dateStr)}</span>
            </div>
          )}

          {/* Location text */}
          {event.locationName && (
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
              <span>{event.locationName}</span>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {event.description}
            </div>
          )}

          {/* RSVP */}
          {!past && (
            <RSVPButton
              currentStatus={(event as any).myRsvpStatus ?? null}
              onSelect={(status) => rsvpMutation.mutate(status)}
              disabled={rsvpMutation.isPending}
            />
          )}

          {/* Participants */}
          {(event as any).counts && (
            <ParticipantList
              participants={(event as any).participants ?? []}
              counts={(event as any).counts}
            />
          )}
        </div>
      </div>
    </div>
  );
}
