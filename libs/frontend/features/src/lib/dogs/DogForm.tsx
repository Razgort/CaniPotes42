import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { Camera, ImagePlus, RotateCcw } from 'lucide-react';
import { useAuth } from '@org/data-access';
import { toast } from '@org/ui';
import { createDogSchema, updateDogSchema } from '@org/types';
import type { CreateDog, UpdateDog } from '@org/types';
import { useCreateDog, useUpdateDog, useUploadDogPhoto } from './hooks/useDogs';
import type { DogDto } from './hooks/useDogs';

interface DogFormProps {
  /** When provided, renders in edit mode pre-populated with existing data */
  existingDog?: DogDto;
}

export function DogForm({ existingDog }: DogFormProps) {
  const navigate = useNavigate();
  const { activeClub } = useAuth();
  const clubId = activeClub?.id ?? null;

  const isEditMode = !!existingDog;

  // Photo state
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(existingDog?.photoUrl ?? null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createDog = useCreateDog(clubId);
  const updateDog = useUpdateDog(clubId);
  const uploadPhoto = useUploadDogPhoto(clubId);

  const schema = isEditMode ? updateDogSchema : createDogSchema;
  const defaultValues = isEditMode
    ? {
        name: existingDog.name,
        breed: existingDog.breed ?? undefined,
        birthdate: existingDog.birthdate
          ? existingDog.birthdate.substring(0, 10)
          : undefined,
        chipNumber: existingDog.chipNumber ?? undefined,
      }
    : {};

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateDog | UpdateDog>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  function handlePhotoSelected(file: File) {
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setPhotoPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  function handleRetakePhoto() {
    setPhotoFile(null);
    setPhotoPreview(existingDog?.photoUrl ?? null);
  }

  const onSubmit = async (formData: CreateDog | UpdateDog) => {
    try {
      let dogId: string;

      if (isEditMode) {
        const result = await updateDog.mutateAsync({ dogId: existingDog.id, data: formData });
        dogId = result.data.id;
        toast.success('Profil mis à jour');
      } else {
        const result = await createDog.mutateAsync(formData as CreateDog);
        dogId = result.data.id;
        toast.success('Chien ajouté');
      }

      // Upload photo if selected
      if (photoFile) {
        try {
          await uploadPhoto.mutateAsync({ dogId, file: photoFile });
        } catch {
          toast.error('Profil enregistré, mais la photo n\'a pas pu être téléchargée');
        }
      }

      navigate(`/dogs/${dogId}`);
    } catch {
      toast.error(isEditMode ? 'Erreur lors de la mise à jour' : 'Erreur lors de la création');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">
          {isEditMode ? 'Modifier le profil' : 'Ajouter un chien'}
        </h1>
      </div>

      {/* Photo upload — camera-first pattern (UX-DR19) */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Photo (facultatif)</label>
        {photoPreview ? (
          <div className="flex flex-col items-center gap-3">
            <img
              src={photoPreview}
              alt="Aperçu"
              className="h-24 w-24 rounded-full object-cover"
            />
            <button
              type="button"
              onClick={handleRetakePhoto}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reprendre
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row">
            {/* Primary: camera (camera-first) */}
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 px-4 py-3 text-sm font-medium text-primary hover:border-primary/60 hover:bg-primary/10"
              aria-label="Prendre une photo"
            >
              <Camera className="h-4 w-4" />
              Prendre en photo
            </button>
            {/* Secondary: file picker */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-accent"
              aria-label="Choisir un fichier"
            >
              <ImagePlus className="h-4 w-4" />
              Choisir un fichier
            </button>
          </div>
        )}
        {/* Hidden inputs */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handlePhotoSelected(file);
          }}
          aria-hidden="true"
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handlePhotoSelected(file);
          }}
          aria-hidden="true"
        />
      </div>

      {/* Nom */}
      <div className="space-y-1">
        <label htmlFor="dog-name" className="text-sm font-medium">
          Nom
        </label>
        <input
          id="dog-name"
          type="text"
          {...register('name')}
          placeholder="Nom du chien"
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
          aria-describedby={errors.name ? 'dog-name-error' : undefined}
        />
        {errors.name && (
          <p id="dog-name-error" className="text-sm text-destructive" role="alert">
            {errors.name.message}
          </p>
        )}
      </div>

      {/* Race */}
      <div className="space-y-1">
        <label htmlFor="dog-breed" className="text-sm font-medium">
          Race <span className="text-muted-foreground font-normal">(facultatif)</span>
        </label>
        <input
          id="dog-breed"
          type="text"
          {...register('breed')}
          placeholder="Labrador, Berger allemand..."
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Date de naissance */}
      <div className="space-y-1">
        <label htmlFor="dog-birthdate" className="text-sm font-medium">
          Date de naissance <span className="text-muted-foreground font-normal">(facultatif)</span>
        </label>
        <input
          id="dog-birthdate"
          type="date"
          {...register('birthdate')}
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* N° de puce */}
      <div className="space-y-1">
        <label htmlFor="dog-chip" className="text-sm font-medium">
          N° de puce <span className="text-muted-foreground font-normal">(facultatif)</span>
        </label>
        <input
          id="dog-chip"
          type="text"
          {...register('chipNumber')}
          placeholder="123456789012345"
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex-1 rounded-lg border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {isSubmitting ? 'Enregistrement...' : isEditMode ? 'Enregistrer' : 'Ajouter'}
        </button>
      </div>
    </form>
  );
}

export default DogForm;
