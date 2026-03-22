import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createVaccineSchema, type CreateVaccine } from '@org/types';
import { toast } from '@org/ui';
import { useCreateVaccine, useUpdateVaccine } from './hooks/useVaccines';
import type { VaccineDto } from './hooks/useVaccines';

interface VaccineFormProps {
  clubId: string | null;
  dogId: string;
  dogName: string;
  existingVaccine?: VaccineDto;
  onSuccess: (vaccine: VaccineDto) => void;
  onCancel: () => void;
}

export function VaccineForm({
  clubId,
  dogId,
  dogName,
  existingVaccine,
  onSuccess,
  onCancel,
}: VaccineFormProps) {
  const isEditing = !!existingVaccine;
  const createVaccine = useCreateVaccine(clubId, dogId);
  const updateVaccine = useUpdateVaccine(clubId, dogId);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateVaccine>({
    resolver: zodResolver(createVaccineSchema),
    mode: 'onBlur',
    defaultValues: {
      vaccineName: existingVaccine?.vaccineName ?? '',
      dateAdministered: existingVaccine?.dateAdministered
        ? existingVaccine.dateAdministered.slice(0, 10)
        : '',
      expiryDate: existingVaccine?.expiryDate
        ? existingVaccine.expiryDate.slice(0, 10)
        : '',
    },
  });

  const onSubmit = async (data: CreateVaccine) => {
    try {
      let result: VaccineDto;
      if (isEditing && existingVaccine) {
        result = await updateVaccine.mutateAsync({
          vaccineId: existingVaccine.id,
          data,
        });
        toast.success('Vaccin mis à jour');
      } else {
        result = await createVaccine.mutateAsync(data);
        toast.success('Vaccin ajouté');
      }
      onSuccess(result);
    } catch {
      toast.error('Nous n\'avons pas pu enregistrer ce vaccin. Veuillez réessayer.');
    }
  };

  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      <h2 className="font-medium">
        {isEditing ? 'Modifier le vaccin' : `Ajouter un vaccin — ${dogName}`}
      </h2>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {/* Vaccine name */}
        <div className="flex flex-col gap-1">
          <label htmlFor="vaccineName" className="text-sm font-medium text-foreground">
            Nom du vaccin <span className="text-destructive">*</span>
          </label>
          <input
            id="vaccineName"
            type="text"
            placeholder="Ex: Rage, DHPP, CHPPiL..."
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            style={{ fontSize: '16px' }}
            {...register('vaccineName')}
          />
          {errors.vaccineName && (
            <p className="text-xs text-destructive">{errors.vaccineName.message}</p>
          )}
        </div>

        {/* Date administered */}
        <div className="flex flex-col gap-1">
          <label htmlFor="dateAdministered" className="text-sm font-medium text-foreground">
            Date d'administration <span className="text-destructive">*</span>
          </label>
          <input
            id="dateAdministered"
            type="date"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            style={{ fontSize: '16px' }}
            {...register('dateAdministered')}
          />
          {errors.dateAdministered && (
            <p className="text-xs text-destructive">{errors.dateAdministered.message}</p>
          )}
        </div>

        {/* Expiry date */}
        <div className="flex flex-col gap-1">
          <label htmlFor="expiryDate" className="text-sm font-medium text-foreground">
            Date d'expiration <span className="text-destructive">*</span>
          </label>
          <input
            id="expiryDate"
            type="date"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            style={{ fontSize: '16px' }}
            {...register('expiryDate')}
          />
          {errors.expiryDate && (
            <p className="text-xs text-destructive">{errors.expiryDate.message}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-accent"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting
              ? isEditing ? 'Mise à jour...' : 'Enregistrement...'
              : isEditing ? 'Mettre à jour' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default VaccineForm;
