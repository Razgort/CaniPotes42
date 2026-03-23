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

// ─── Edit mode: interactive pin placement for event creation ─────────────────

export interface MapWidgetEditorProps {
  latitude: number | null;
  longitude: number | null;
  onLocationChange: (lat: number, lng: number, locationName?: string) => void;
  className?: string;
}

let reverseGeocodeTimer: ReturnType<typeof setTimeout> | null = null;

function reverseGeocode(lat: number, lng: number, callback: (name: string | undefined) => void) {
  if (reverseGeocodeTimer) clearTimeout(reverseGeocodeTimer);
  reverseGeocodeTimer = setTimeout(() => {
    fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=fr`,
    )
      .then((r) => r.json())
      .then((data) => {
        const name = data?.display_name as string | undefined;
        callback(name || undefined);
      })
      .catch(() => callback(undefined));
  }, 500);
}

export function MapWidgetEditor({
  latitude,
  longitude,
  onLocationChange,
  className,
}: MapWidgetEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import('leaflet').Map | null>(null);
  const markerRef = useRef<import('leaflet').Marker | null>(null);
  const loadedRef = useRef(false);
  const errorRef = useRef(false);

  // Default center: France center if no coords
  const defaultLat = latitude ?? 46.6;
  const defaultLng = longitude ?? 2.3;
  const defaultZoom = latitude !== null ? 15 : 6;

  useEffect(() => {
    if (!containerRef.current || loadedRef.current) return;

    let map: import('leaflet').Map | null = null;

    import('leaflet')
      .then((L) => {
        if (!containerRef.current || loadedRef.current) return;
        loadedRef.current = true;
        fixLeafletIcons();

        // Import CSS
        import('leaflet/dist/leaflet.css');

        map = L.map(containerRef.current, {
          center: [defaultLat, defaultLng],
          zoom: defaultZoom,
          zoomControl: true,
          dragging: true,
          scrollWheelZoom: true,
          doubleClickZoom: false,
          touchZoom: true,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
        }).addTo(map);

        // Place initial marker if coords exist
        if (latitude !== null && longitude !== null) {
          const marker = L.marker([latitude, longitude], { draggable: true });
          marker.addTo(map);
          markerRef.current = marker;

          marker.on('dragend', () => {
            const pos = marker.getLatLng();
            reverseGeocode(pos.lat, pos.lng, (name) => {
              onLocationChange(pos.lat, pos.lng, name);
            });
          });
        }

        // Click to place or move pin
        map.on('click', (e: import('leaflet').LeafletMouseEvent) => {
          const { lat, lng } = e.latlng;

          if (markerRef.current) {
            markerRef.current.setLatLng([lat, lng]);
          } else {
            const marker = L.marker([lat, lng], { draggable: true });
            marker.addTo(map!);
            markerRef.current = marker;

            marker.on('dragend', () => {
              const pos = marker.getLatLng();
              reverseGeocode(pos.lat, pos.lng, (name) => {
                onLocationChange(pos.lat, pos.lng, name);
              });
            });
          }

          reverseGeocode(lat, lng, (name) => {
            onLocationChange(lat, lng, name);
          });
        });

        mapRef.current = map;
      })
      .catch(() => {
        errorRef.current = true;
        loadedRef.current = false;
      });

    return () => {
      if (map) {
        map.remove();
        mapRef.current = null;
        markerRef.current = null;
        loadedRef.current = false;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={cn('relative w-full', className)}>
      <div
        ref={containerRef}
        className="w-full rounded-xl overflow-hidden"
        style={{ height: 300, minHeight: 300 }}
        role="application"
        aria-label="Carte interactive — cliquez pour placer un repère"
      />
      <p className="mt-1 text-xs text-muted-foreground text-center">
        Cliquez sur la carte pour placer le repère, puis glissez-le pour ajuster
      </p>
    </div>
  );
}
