import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { updateEventSchema } from '@org/types';
import type { UpdateEvent } from '@org/types';
import { useEventDetail } from './hooks/useEventDetail';
import { useUpdateEvent } from './hooks/useEventMutations';

// Convert ISO string to datetime-local input value (YYYY-MM-DDTHH:mm)
function toDatetimeLocal(iso: string): string {
  return iso.slice(0, 16);
}

// Convert datetime-local value back to full ISO string
function fromDatetimeLocal(value: string): string {
  return new Date(value).toISOString();
}

export default function EventForm() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { event, isLoading } = useEventDetail(eventId);
  const updateMutation = useUpdateEvent(eventId ?? '');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<UpdateEvent>({
    resolver: zodResolver(updateEventSchema),
  });

  // Pre-fill form once event is loaded
  useEffect(() => {
    if (event) {
      reset({
        title: event.title,
        description: event.description ?? undefined,
        dateTime: toDatetimeLocal(event.dateTime),
        latitude: event.latitude,
        longitude: event.longitude,
        locationName: event.locationName ?? undefined,
      });
    }
  }, [event, reset]);

  async function onSubmit(data: UpdateEvent) {
    const payload: UpdateEvent = { ...data };
    if (payload.dateTime) {
      payload.dateTime = fromDatetimeLocal(payload.dateTime as string);
    }
    await updateMutation.mutateAsync(payload, {
      onSuccess: () => navigate(`/events/${eventId}`),
    });
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-4">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (!event) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground">
        Événement introuvable.
      </div>
    );
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
        <h1 className="text-base font-semibold truncate flex-1">Modifier l&apos;événement</h1>
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
            placeholder="Description de l'événement (optionnel)"
          />
          {errors.description && (
            <p className="text-xs text-destructive">{errors.description.message}</p>
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
          />
          {errors.dateTime && (
            <p className="text-xs text-destructive">{errors.dateTime.message}</p>
          )}
        </div>

        {/* Location name */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="locationName" className="text-sm font-medium">
            Lieu
          </label>
          <input
            id="locationName"
            type="text"
            {...register('locationName')}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Nom du lieu"
          />
          {errors.locationName && (
            <p className="text-xs text-destructive">{errors.locationName.message}</p>
          )}
        </div>

        {/* GPS coords — displayed read-only for now */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="latitude" className="text-sm font-medium">
              Latitude
            </label>
            <input
              id="latitude"
              type="number"
              step="any"
              {...register('latitude', { valueAsNumber: true })}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {errors.latitude && (
              <p className="text-xs text-destructive">{errors.latitude.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="longitude" className="text-sm font-medium">
              Longitude
            </label>
            <input
              id="longitude"
              type="number"
              step="any"
              {...register('longitude', { valueAsNumber: true })}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {errors.longitude && (
              <p className="text-xs text-destructive">{errors.longitude.message}</p>
            )}
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting || !isDirty || updateMutation.isPending}
          className="mt-2 rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {updateMutation.isPending ? 'Enregistrement…' : 'Enregistrer les modifications'}
        </button>
      </form>
    </div>
  );
}
