import { useEffect, useRef } from 'react';
import { SkeletonCard } from './Skeleton';
import { cn } from './cn';

// Fix Leaflet default marker icon with Vite bundling
function fixLeafletIcons() {
  if (typeof window === 'undefined') return;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const L = require('leaflet') as typeof import('leaflet');
  const iconUrl = new URL(
    'leaflet/dist/images/marker-icon.png',
    import.meta.url,
  ).href;
  const shadowUrl = new URL(
    'leaflet/dist/images/marker-shadow.png',
    import.meta.url,
  ).href;
  L.Icon.Default.mergeOptions({ iconUrl, shadowUrl });
}

export interface MapWidgetProps {
  latitude: number | null;
  longitude: number | null;
  locationName?: string | null;
  className?: string;
}

export function MapWidget({
  latitude,
  longitude,
  locationName,
  className,
}: MapWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import('leaflet').Map | null>(null);
  const loadedRef = useRef(false);
  const hasCoords = latitude !== null && longitude !== null;

  useEffect(() => {
    if (!hasCoords || !containerRef.current || loadedRef.current) return;

    let map: import('leaflet').Map | null = null;

    import('leaflet')
      .then((L) => {
        if (!containerRef.current || loadedRef.current) return;
        loadedRef.current = true;
        fixLeafletIcons();

        map = L.map(containerRef.current, {
          center: [latitude!, longitude!],
          zoom: 15,
          zoomControl: false,
          dragging: false,
          scrollWheelZoom: false,
          doubleClickZoom: false,
          touchZoom: false,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
        }).addTo(map);

        const marker = L.marker([latitude!, longitude!]);
        if (locationName) {
          marker.bindPopup(locationName);
        }
        marker.addTo(map);

        mapRef.current = map;
      })
      .catch(() => {
        // Map failed to load — error state rendered below via hasError logic
        loadedRef.current = false;
      });

    return () => {
      if (map) {
        map.remove();
        mapRef.current = null;
        loadedRef.current = false;
      }
    };
  }, [hasCoords, latitude, longitude, locationName]);

  if (!hasCoords) {
    return null;
  }

  return (
    <div className={cn('relative w-full', className)}>
      {/* aria-hidden: map is decorative; screen readers use text fallback */}
      <div
        ref={containerRef}
        aria-hidden="true"
        className="w-full rounded-xl overflow-hidden"
        style={{ height: 200, minHeight: 200 }}
      />
      {/* Screen reader text fallback */}
      <span className="sr-only">
        {locationName
          ? `Carte : ${locationName}`
          : `Coordonnées GPS : ${latitude}, ${longitude}`}
      </span>
    </div>
  );
}

export interface MapWidgetErrorProps {
  latitude: number | null;
  longitude: number | null;
  locationName?: string | null;
  className?: string;
}

export function MapWidgetError({
  latitude,
  longitude,
  locationName,
  className,
}: MapWidgetErrorProps) {
  return (
    <div
      className={cn(
        'w-full rounded-xl bg-muted flex flex-col items-center justify-center p-4 text-center',
        className,
      )}
      style={{ minHeight: 120 }}
    >
      <p className="text-sm font-medium text-muted-foreground">
        Carte indisponible
      </p>
      {locationName && (
        <p className="text-sm text-muted-foreground mt-1">{locationName}</p>
      )}
      {latitude !== null && longitude !== null && (
        <p className="text-xs text-muted-foreground mt-1">
          {latitude.toFixed(5)}, {longitude.toFixed(5)}
        </p>
      )}
    </div>
  );
}

export function MapWidgetSkeleton({ className }: { className?: string }) {
  return <SkeletonCard height={200} className={cn('rounded-xl', className)} />;
}
