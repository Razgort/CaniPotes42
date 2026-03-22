import { cn } from './cn';

export interface NavigateButtonProps {
  latitude: number | null;
  longitude: number | null;
  locationName?: string | null;
  className?: string;
}

function buildWazeUrl(lat: number, lng: number): string {
  return `waze://?ll=${lat},${lng}&navigate=yes`;
}

function buildGoogleMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

export function NavigateButton({
  latitude,
  longitude,
  locationName,
  className,
}: NavigateButtonProps) {
  const hasCoords = latitude !== null && longitude !== null;
  const locationLabel = locationName ?? `${latitude}, ${longitude}`;

  if (!hasCoords) {
    return (
      <button
        type="button"
        disabled
        aria-label="Navigation indisponible — aucune coordonnée GPS pour cet événement"
        className={cn(
          'flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3',
          'min-h-[48px] text-sm font-semibold',
          'bg-muted text-muted-foreground cursor-not-allowed opacity-60',
          className,
        )}
      >
        <NavigationIcon />
        S&apos;y rendre
      </button>
    );
  }

  // Show two explicit buttons: Waze and Google Maps
  // Avoids unreliable app detection on PWA — user chooses their preferred app
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <a
        href={buildWazeUrl(latitude, longitude)}
        aria-label={`Ouvrir l'itinéraire vers ${locationLabel} dans Waze`}
        className={cn(
          'flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3',
          'min-h-[48px] text-sm font-semibold no-underline',
          'bg-[#F97316] text-white hover:bg-[#ea6c0a] active:bg-[#d66009]',
          'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] focus-visible:ring-offset-2',
        )}
      >
        <NavigationIcon />
        Naviguer avec Waze
      </a>
      <a
        href={buildGoogleMapsUrl(latitude, longitude)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Ouvrir l'itinéraire vers ${locationLabel} dans Google Maps`}
        className={cn(
          'flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3',
          'min-h-[48px] text-sm font-semibold no-underline',
          'bg-muted text-foreground hover:bg-muted/80 active:bg-muted/60',
          'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        )}
      >
        <NavigationIcon />
        Naviguer avec Google Maps
      </a>
    </div>
  );
}

function NavigationIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polygon points="3 11 22 2 13 21 11 13 3 11" />
    </svg>
  );
}
