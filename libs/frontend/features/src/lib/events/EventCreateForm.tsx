import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { z } from 'zod';
import { createEventSchema } from '@org/types';
import type { CreateEvent } from '@org/types';
import { MapWidgetEditor, MapWidgetError } from '@org/ui';
import { useCreateEvent } from './hooks/useEventMutations';

// Form schema: dateTime accepts datetime-local format (ISO conversion happens in onSubmit)
const formSchema = createEventSchema.omit({ status: true }).extend({
  dateTime: z.string().min(1, 'La date est requise'),
});
type FormValues = z.infer<typeof formSchema>;

// Convert datetime-local value to ISO string
function fromDatetimeLocal(value: string): string {
  return new Date(value).toISOString();
}

export default function EventCreateForm() {
  const navigate = useNavigate();
  const createMutation = useCreateEvent();
  const [mapError, setMapError] = useState(false);
  const [locationName, setLocationName] = useState<string | undefined>();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  const lat = watch('latitude');
  const lng = watch('longitude');

  const handleLocationChange = useCallback(
    (newLat: number, newLng: number, name?: string) => {
      setValue('latitude', newLat, { shouldValidate: true });
      setValue('longitude', newLng, { shouldValidate: true });
      if (name) {
        setValue('locationName', name);
        setLocationName(name);
      }
    },
    [setValue],
  );

  async function onSubmit(data: FormValues) {
    const payload = {
      ...data,
      dateTime: fromDatetimeLocal(data.dateTime),
    };
    const result = await createMutation.mutateAsync(payload);
    const eventId = (result as { data: { id: string } }).data.id;
    navigate(`/events/${eventId}`);
  }

  return (
    <div className="flex flex-col min-h-0">
      <header className="flex items-center gap-3 p-4 border-b sticky top-0 bg-background z-10">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Retour"
          className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-base font-semibold truncate flex-1">
          Nouvel événement
        </h1>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5 p-4">
        {/* Title */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="title" className="text-sm font-medium">
            Titre <span className="text-destructive">*</span>
          </label>
          <input
            id="title"
            type="text"
            {...register('title')}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            style={{ fontSize: 16 }}
            placeholder="Nom de l'événement"
          />
          {errors.title && (
            <p className="text-xs text-destructive">{errors.title.message}</p>
          )}
        </div>

        {/* Description */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="description" className="text-sm font-medium">
            Description
          </label>
          <textarea
            id="description"
            rows={4}
            {...register('description')}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            style={{ fontSize: 16 }}
            placeholder="Description de l'événement (optionnel)"
          />
          {errors.description && (
            <p className="text-xs text-destructive">
              {errors.description.message}
            </p>
          )}
        </div>

        {/* Date & time */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="dateTime" className="text-sm font-medium">
            Date et heure <span className="text-destructive">*</span>
          </label>
          <input
            id="dateTime"
            type="datetime-local"
            {...register('dateTime')}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            style={{ fontSize: 16 }}
          />
          {errors.dateTime && (
            <p className="text-xs text-destructive">
              {errors.dateTime.message}
            </p>
          )}
        </div>

        {/* Location — Map or fallback */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">
            Lieu <span className="text-destructive">*</span>
          </label>

          {mapError ? (
            <>
              <MapWidgetError
                latitude={lat ?? null}
                longitude={lng ?? null}
                locationName={locationName}
              />
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div className="flex flex-col gap-1">
                  <label htmlFor="latitude" className="text-xs font-medium">
                    Latitude
                  </label>
                  <input
                    id="latitude"
                    type="number"
                    step="any"
                    {...register('latitude', { valueAsNumber: true })}
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    style={{ fontSize: 16 }}
                    placeholder="45.4397"
                  />
                  {errors.latitude && (
                    <p className="text-xs text-destructive">
                      {errors.latitude.message}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="longitude" className="text-xs font-medium">
                    Longitude
                  </label>
                  <input
                    id="longitude"
                    type="number"
                    step="any"
                    {...register('longitude', { valueAsNumber: true })}
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    style={{ fontSize: 16 }}
                    placeholder="4.3872"
                  />
                  {errors.longitude && (
                    <p className="text-xs text-destructive">
                      {errors.longitude.message}
                    </p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <MapWidgetEditor
              latitude={lat ?? null}
              longitude={lng ?? null}
              onLocationChange={handleLocationChange}
            />
          )}

          {/* Toggle map error state for testing/fallback */}
          <button
            type="button"
            onClick={() => setMapError((v) => !v)}
            className="text-xs text-muted-foreground underline self-end"
          >
            {mapError ? 'Réessayer la carte' : 'Saisie manuelle'}
          </button>

          {locationName && (
            <p className="text-xs text-muted-foreground">{locationName}</p>
          )}

          {/* Location name (optional) */}
          <input
            type="text"
            {...register('locationName')}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            style={{ fontSize: 16 }}
            placeholder="Nom du lieu (optionnel)"
          />

          {(errors.latitude || errors.longitude) && !mapError && (
            <p className="text-xs text-destructive">
              Veuillez placer un repère sur la carte
            </p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting || createMutation.isPending}
          className="mt-2 rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {createMutation.isPending
            ? 'Création en cours…'
            : 'Créer l\'événement'}
        </button>
      </form>
    </div>
  );
}
