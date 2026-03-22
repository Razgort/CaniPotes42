import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { toast, SkeletonList } from '@org/ui';
import { useAuth, ApiClientError } from '@org/data-access';
import { updateClubSchema } from '@org/types';
import type { UpdateClub } from '@org/types';
import {
  useClubSettings,
  useUpdateClubSettings,
  useUploadClubLogo,
} from './hooks/useClubSettings';

const FEDERATION_OPTIONS = [
  { value: 'FFSLC', label: 'FFSLC' },
  { value: 'CNEAC', label: 'CNEAC' },
  { value: 'OTHER', label: 'Autre' },
  { value: 'NONE', label: 'Aucune' },
] as const;

const MAX_LOGO_SIZE = 2 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function ClubSettings() {
  const navigate = useNavigate();
  const { role } = useAuth();
  const { data: club, isLoading, error } = useClubSettings();
  const updateMutation = useUpdateClubSettings();
  const logoMutation = useUploadClubLogo();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Redirect non-OWNER
  useEffect(() => {
    if (role && role !== 'OWNER') {
      navigate('/', { replace: true });
    }
  }, [role, navigate]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setError,
  } = useForm<UpdateClub>({
    resolver: zodResolver(updateClubSchema),
    mode: 'onBlur',
  });

  // Pre-populate form when data loads
  useEffect(() => {
    if (club) {
      reset({
        name: club.name,
        federation: (club.federation as UpdateClub['federation']) ?? undefined,
        contactEmail: club.contactEmail,
        description: club.description ?? undefined,
      });
      setLogoPreview(club.logo);
    }
  }, [club, reset]);

  const onSubmit = async (data: UpdateClub) => {
    try {
      await updateMutation.mutateAsync(data);
      toast.success('Parametres du club mis a jour');
    } catch (err) {
      if (err instanceof ApiClientError && err.details) {
        for (const [field, messages] of Object.entries(err.details)) {
          if (field in data) {
            setError(field as keyof UpdateClub, {
              message: messages[0],
            });
          }
        }
      }
      toast.error("Nous n'avons pas pu mettre a jour les parametres");
    }
  };

  const handleLogoSelect = async (file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Format invalide. Formats acceptes : JPEG, PNG, WebP');
      return;
    }
    if (file.size > MAX_LOGO_SIZE) {
      toast.error('Le fichier est trop volumineux (max 2 Mo)');
      return;
    }

    // Optimistic preview
    const previewUrl = URL.createObjectURL(file);
    setLogoPreview(previewUrl);

    try {
      await logoMutation.mutateAsync(file);
      toast.success('Logo mis a jour');
    } catch {
      // Revert preview on failure
      setLogoPreview(club?.logo ?? null);
      toast.error("Nous n'avons pas pu mettre a jour le logo");
    } finally {
      URL.revokeObjectURL(previewUrl);
    }
  };

  const scrollToFirstError = () => {
    const firstError = document.querySelector('[data-error="true"]');
    if (firstError) {
      firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const input = firstError.querySelector('input, textarea, select');
      if (input instanceof HTMLElement) input.focus();
    }
  };

  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      scrollToFirstError();
    }
  }, [errors]);

  if (role !== 'OWNER') return null;

  if (isLoading) {
    return (
      <div className="p-4">
        <SkeletonList count={5} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-danger">
        Nous n'avons pas pu charger les parametres du club.
      </div>
    );
  }

  return (
    <div className="p-4 pb-24">
      <h1 className="text-xl font-bold mb-6">Parametres du club</h1>

      {/* Logo section */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Logo du club</label>
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-lg bg-border/30 flex items-center justify-center overflow-hidden">
            {logoPreview ? (
              <img
                src={logoPreview}
                alt="Logo du club"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-3xl text-muted">📷</span>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              className="min-h-[44px] px-4 py-2 bg-primary text-white rounded-lg font-medium disabled:opacity-50"
              onClick={() => fileInputRef.current?.click()}
              disabled={logoMutation.isPending}
            >
              {logoMutation.isPending ? 'Upload en cours...' : 'Changer le logo'}
            </button>
            <button
              type="button"
              className="min-h-[44px] px-4 py-2 text-sm text-muted underline"
              onClick={() => fileInputRef.current?.click()}
              disabled={logoMutation.isPending}
            >
              Choisir un fichier
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleLogoSelect(file);
              e.target.value = '';
            }}
          />
        </div>
        <p className="text-xs text-muted mt-1">JPEG, PNG ou WebP. Max 2 Mo.</p>
      </div>

      {/* Settings form */}
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        {/* Club name */}
        <div className="mb-4" data-error={!!errors.name || undefined}>
          <label htmlFor="club-name" className="block text-sm font-medium mb-1">
            Nom du club *
          </label>
          <input
            id="club-name"
            type="text"
            className="w-full min-h-[44px] px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            {...register('name')}
          />
          {errors.name && (
            <p className="text-sm text-danger mt-1">
              Nous avons besoin d'un nom de club (min. 2 caracteres)
            </p>
          )}
        </div>

        {/* Federation */}
        <div className="mb-4" data-error={!!errors.federation || undefined}>
          <label className="block text-sm font-medium mb-2">Federation</label>
          <div className="flex flex-wrap gap-2">
            {FEDERATION_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex items-center gap-2 min-h-[44px] px-3 py-2 border rounded-lg cursor-pointer has-[:checked]:bg-primary/10 has-[:checked]:border-primary"
              >
                <input
                  type="radio"
                  value={opt.value}
                  {...register('federation')}
                  className="accent-primary"
                />
                <span className="text-sm">{opt.label}</span>
              </label>
            ))}
          </div>
          {errors.federation && (
            <p className="text-sm text-danger mt-1">
              Nous avons besoin de connaitre votre federation
            </p>
          )}
        </div>

        {/* Contact email */}
        <div className="mb-4" data-error={!!errors.contactEmail || undefined}>
          <label
            htmlFor="contact-email"
            className="block text-sm font-medium mb-1"
          >
            Email de contact *
          </label>
          <input
            id="contact-email"
            type="email"
            className="w-full min-h-[44px] px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            {...register('contactEmail')}
          />
          {errors.contactEmail && (
            <p className="text-sm text-danger mt-1">
              Nous avons besoin d'une adresse email valide
            </p>
          )}
        </div>

        {/* Description */}
        <div className="mb-6" data-error={!!errors.description || undefined}>
          <label
            htmlFor="description"
            className="block text-sm font-medium mb-1"
          >
            Description
          </label>
          <textarea
            id="description"
            rows={4}
            maxLength={500}
            className="w-full min-h-[44px] px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary resize-none"
            {...register('description')}
          />
          {errors.description && (
            <p className="text-sm text-danger mt-1">
              La description ne doit pas depasser 500 caracteres
            </p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting || updateMutation.isPending}
          className="w-full min-h-[44px] px-4 py-3 bg-primary text-white rounded-lg font-semibold disabled:opacity-50 flex items-center justify-center"
        >
          {isSubmitting || updateMutation.isPending ? (
            <span className="animate-spin mr-2">⟳</span>
          ) : null}
          Enregistrer
        </button>
      </form>
    </div>
  );
}

export default ClubSettings;
