import { useRef, useState } from 'react';
import { Camera, FolderOpen, X } from 'lucide-react';
import { toast } from '@org/ui';
import { DocumentType } from '@org/types';
import { useUploadDocument } from './hooks/useDocuments';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  [DocumentType.REGISTRATION_FORM]: 'Formulaire d\'inscription',
  [DocumentType.VACCINE_CERTIFICATE]: 'Certificat de vaccination',
  [DocumentType.HEALTH_RECORD]: 'Carnet de santé',
  [DocumentType.LICENSE]: 'Licence',
  [DocumentType.OTHER]: 'Autre',
};

interface Dog {
  id: string;
  name: string;
}

interface UploadFormProps {
  clubId: string;
  dogs?: Dog[];
  preselectedDogId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function UploadForm({ clubId, dogs = [], preselectedDogId, onSuccess, onCancel }: UploadFormProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [documentType, setDocumentType] = useState<DocumentType | ''>('');
  const [expiryDate, setExpiryDate] = useState('');
  const [associatedTo, setAssociatedTo] = useState<string>(preselectedDogId ?? '');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const { mutate: uploadDocument, isPending } = useUploadDocument(clubId);

  function validateFile(file: File): string | null {
    if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
      return 'Type de fichier invalide. Types acceptés : JPEG, PNG, WebP, PDF';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'Le fichier est trop volumineux (max 5 Mo)';
    }
    return null;
  }

  function handleFileSelected(file: File) {
    const error = validateFile(file);
    setFileError(error);
    if (!error) {
      setSelectedFile(file);
    }
  }

  function handleCameraChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFileSelected(file);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFileSelected(file);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedFile) {
      setFileError('Veuillez sélectionner un fichier');
      return;
    }
    if (!documentType) return;

    const dogId = associatedTo !== '' && associatedTo !== 'me' ? associatedTo : undefined;

    setUploadProgress(0);

    uploadDocument(
      {
        file: selectedFile,
        type: documentType,
        expiryDate: expiryDate || undefined,
        dogId,
        onProgress: (percent) => setUploadProgress(percent),
      },
      {
        onSuccess: () => {
          setUploadProgress(null);
          toast.success('Document ajouté');
          onSuccess?.();
        },
        onError: () => {
          setUploadProgress(null);
          toast.error("Nous n'avons pas pu télécharger ce fichier — réessayez");
          // Form state preserved — user can retry
        },
      },
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 p-4"
      aria-label="Formulaire d'ajout de document"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Ajouter un document</h2>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full p-1 text-muted-foreground hover:bg-muted"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Camera-first file selection (UX-DR19) */}
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Fichier *</span>
        <div className="flex gap-3">
          {/* Camera — prominent primary action */}
          <button
            type="button"
            className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            onClick={() => cameraInputRef.current?.click()}
          >
            <Camera className="h-5 w-5" />
            Prendre en photo
          </button>
          {/* File picker — secondary */}
          <button
            type="button"
            className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
            onClick={() => fileInputRef.current?.click()}
          >
            <FolderOpen className="h-5 w-5" />
            Choisir un fichier
          </button>
        </div>

        {/* Hidden inputs */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={handleCameraChange}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="sr-only"
          onChange={handleFileChange}
        />

        {/* Selected file name */}
        {selectedFile && !fileError && (
          <p className="text-sm text-muted-foreground">
            Fichier sélectionné : <span className="font-medium text-foreground">{selectedFile.name}</span>
          </p>
        )}

        {/* File error */}
        {fileError && (
          <p role="alert" className="text-sm text-danger">
            {fileError}
          </p>
        )}
      </div>

      {/* Document type — required */}
      <div className="flex flex-col gap-1">
        <label htmlFor="doc-type" className="text-sm font-medium">
          Type de document *
        </label>
        <select
          id="doc-type"
          value={documentType}
          onChange={(e) => setDocumentType(e.target.value as DocumentType)}
          required
          className="min-h-[44px] rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Sélectionner un type</option>
          {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Expiry date — optional */}
      <div className="flex flex-col gap-1">
        <label htmlFor="expiry-date" className="text-sm font-medium">
          Date d'expiration <span className="text-muted-foreground">(optionnel)</span>
        </label>
        <input
          id="expiry-date"
          type="date"
          value={expiryDate}
          onChange={(e) => setExpiryDate(e.target.value)}
          className="min-h-[44px] rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Association — self or dog */}
      {dogs.length > 0 && (
        <div className="flex flex-col gap-1">
          <label htmlFor="association" className="text-sm font-medium">
            Associer à
          </label>
          <select
            id="association"
            value={associatedTo}
            onChange={(e) => setAssociatedTo(e.target.value)}
            className="min-h-[44px] rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="me">Moi</option>
            {dogs.map((dog) => (
              <option key={dog.id} value={dog.id}>
                {dog.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Upload progress bar (only exception to skeleton rule) */}
      {uploadProgress !== null && (
        <div
          className="overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={uploadProgress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progression du téléchargement"
        >
          <div
            className="h-2 bg-primary transition-all duration-300"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isPending || !selectedFile || !documentType}
        className="min-h-[44px] rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? 'Téléchargement...' : 'Ajouter le document'}
      </button>
    </form>
  );
}
