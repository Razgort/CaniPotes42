import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Camera } from 'lucide-react';
import { updateProfileSchema } from '@org/types';
import type { UpdateProfile } from '@org/types';
import { toast } from '@org/ui';
import { useAuth } from '@org/data-access';
import { useUpdateProfile, useUploadAvatar } from './hooks/useMembers';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

interface ProfileEditFormProps {
  memberId: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  onDone: () => void;
}

export function ProfileEditForm({
  memberId,
  firstName,
  lastName,
  avatarUrl,
  onDone,
}: ProfileEditFormProps) {
  const { activeClub } = useAuth();
  const clubId = activeClub?.id ?? null;
  const updateProfile = useUpdateProfile(clubId);
  const uploadAvatar = useUploadAvatar(clubId);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UpdateProfile>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: { firstName, lastName },
    mode: 'onBlur',
  });

  const onSubmit = async (data: UpdateProfile) => {
    try {
      await updateProfile.mutateAsync({ memberId, data });
      toast.success('Profil mis a jour');
      onDone();
    } catch {
      toast.error('Une erreur est survenue');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Format non supporté. Utilisez JPEG, PNG ou WebP.');
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error('Fichier trop volumineux (max 5 Mo).');
      return;
    }

    try {
      await uploadAvatar.mutateAsync({ memberId, file });
      toast.success('Photo mise a jour');
    } catch {
      toast.error('Une erreur est survenue');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Avatar upload */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Avatar"
              className="h-20 w-20 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-xl font-medium text-primary">
              {firstName[0]}
              {lastName[0]}
            </div>
          )}
          <label
            htmlFor="avatar-upload"
            className="absolute -bottom-1 -right-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md hover:bg-primary/90"
          >
            <Camera className="h-4 w-4" />
          </label>
          <input
            id="avatar-upload"
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </div>

      {/* Name fields */}
      <div className="space-y-4">
        <div>
          <label htmlFor="firstName" className="mb-1 block text-sm font-medium">
            Prénom
          </label>
          <input
            id="firstName"
            {...register('firstName')}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
          />
          {errors.firstName && (
            <p className="mt-1 text-xs text-red-500">
              {errors.firstName.message}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="lastName" className="mb-1 block text-sm font-medium">
            Nom
          </label>
          <input
            id="lastName"
            {...register('lastName')}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
          />
          {errors.lastName && (
            <p className="mt-1 text-xs text-red-500">
              {errors.lastName.message}
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onDone}
          className="flex-1 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent/50"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>
    </form>
  );
}
