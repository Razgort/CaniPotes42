import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createLicenseTypeSchema } from '@org/types';
import type { CreateLicenseType } from '@org/types';
import type { LicenseTypeDto } from './hooks/useLicenseTypes';

interface LicenseTypeFormProps {
  defaultValues?: Partial<CreateLicenseType>;
  onSubmit: (data: CreateLicenseType) => void;
  isPending: boolean;
  onCancel: () => void;
  mode: 'create' | 'edit';
}

const PROVIDER_OPTIONS = [
  { value: 'STRIPE', label: 'Stripe (carte bancaire)' },
  { value: 'HELLOASSO', label: 'HelloAsso' },
] as const;

export function LicenseTypeForm({
  defaultValues,
  onSubmit,
  isPending,
  onCancel,
  mode,
}: LicenseTypeFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateLicenseType>({
    resolver: zodResolver(createLicenseTypeSchema),
    mode: 'onBlur',
    defaultValues,
  });

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="name" className="text-sm font-medium">
          Nom du type de licence <span className="text-destructive">*</span>
        </label>
        <input
          id="name"
          type="text"
          placeholder="ex: Licence annuelle, Pass journée"
          {...register('name')}
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
        />
        {errors.name && (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-1">
        <label htmlFor="amount" className="text-sm font-medium">
          Montant (€) <span className="text-destructive">*</span>
        </label>
        <input
          id="amount"
          type="number"
          min={1}
          step={1}
          placeholder="ex: 50"
          {...register('amount', { valueAsNumber: true })}
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
        />
        {errors.amount && (
          <p className="text-xs text-destructive">{errors.amount.message}</p>
        )}
      </div>

      <div className="space-y-1">
        <label htmlFor="season" className="text-sm font-medium">
          Saison <span className="text-destructive">*</span>
        </label>
        <input
          id="season"
          type="text"
          placeholder="ex: 2025-2026"
          {...register('season')}
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
        />
        {errors.season && (
          <p className="text-xs text-destructive">{errors.season.message}</p>
        )}
      </div>

      <div className="space-y-1">
        <label htmlFor="paymentProvider" className="text-sm font-medium">
          Prestataire de paiement <span className="text-destructive">*</span>
        </label>
        <select
          id="paymentProvider"
          {...register('paymentProvider')}
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="">Sélectionner...</option>
          {PROVIDER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {errors.paymentProvider && (
          <p className="text-xs text-destructive">{errors.paymentProvider.message}</p>
        )}
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-accent/50"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {isPending ? 'En cours...' : mode === 'create' ? 'Ajouter' : 'Enregistrer'}
        </button>
      </div>
    </form>
  );
}

export function licenseTypeToDtoDefaults(lt: LicenseTypeDto): Partial<CreateLicenseType> {
  return {
    name: lt.name,
    amount: Number(lt.amount),
    season: lt.season,
    paymentProvider: lt.paymentProvider,
  };
}
