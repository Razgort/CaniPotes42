import { useRef, useState } from 'react';
import { Camera, FolderOpen, X } from 'lucide-react';
import { toast } from '@org/ui';
import { useUploadCertificate } from './hooks/useVaccines';

interface CertificateUploadProps {
  clubId: string | null;
  dogId: string;
  vaccineId: string;
  vaccineName: string;
  onComplete: () => void;
  onSkip: () => void;
}

export function CertificateUpload({
  clubId,
  dogId,
  vaccineId,
  vaccineName,
  onComplete,
  onSkip,
}: CertificateUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadCertificate = useUploadCertificate(clubId, dogId);

  const handleFileSelected = (file: File) => {
    const url = URL.createObjectURL(file);
    setPreview(url);
    setSelectedFile(file);
  };

  const handleRetake = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setSelectedFile(null);
    setUploadProgress(0);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    // Simulate progress for UX feedback
    const progressInterval = setInterval(() => {
      setUploadProgress((p) => Math.min(p + 10, 90));
    }, 100);

    try {
      await uploadCertificate.mutateAsync({ vaccineId, file: selectedFile });
      clearInterval(progressInterval);
      setUploadProgress(100);
      toast.success('Certificat ajouté');
      if (preview) URL.revokeObjectURL(preview);
      onComplete();
    } catch {
      clearInterval(progressInterval);
      setUploadProgress(0);
      toast.error('Nous n\'avons pas pu envoyer le certificat. Veuillez réessayer.');
    }
  };

  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">Certificat de vaccination</h2>
        <span className="text-xs text-muted-foreground">{vaccineName}</span>
      </div>
      <p className="text-sm text-muted-foreground">
        Prenez en photo le certificat de vaccination ou choisissez un fichier existant.
      </p>

      {/* Preview */}
      {preview ? (
        <div className="space-y-3">
          <div className="relative">
            <img
              src={preview}
              alt="Aperçu du certificat"
              className="w-full rounded-lg object-contain max-h-64 border"
            />
            <button
              type="button"
              onClick={handleRetake}
              className="absolute top-2 right-2 rounded-full bg-background/80 p-1 shadow hover:bg-background"
              aria-label="Reprendre la photo"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Upload progress */}
          {uploadCertificate.isPending && (
            <div className="space-y-1">
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${uploadProgress}%` }}
                  role="progressbar"
                  aria-valuenow={uploadProgress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Progression de l'envoi"
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Envoi en cours...
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleRetake}
              disabled={uploadCertificate.isPending}
              className="flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-accent disabled:opacity-50"
            >
              Reprendre
            </button>
            <button
              type="button"
              onClick={handleUpload}
              disabled={uploadCertificate.isPending}
              className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {uploadCertificate.isPending ? 'Envoi...' : 'Confirmer'}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Hidden inputs */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            aria-label="Prendre en photo"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelected(file);
            }}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            aria-label="Choisir un fichier"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelected(file);
            }}
          />

          {/* Camera button — primary */}
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-white hover:bg-primary/90 min-h-[44px]"
          >
            <Camera className="h-5 w-5" aria-hidden="true" />
            Prendre en photo
          </button>

          {/* File picker — secondary */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-accent min-h-[44px]"
          >
            <FolderOpen className="h-4 w-4" aria-hidden="true" />
            Choisir un fichier
          </button>

          {/* Skip */}
          <button
            type="button"
            onClick={onSkip}
            className="w-full py-2 text-sm text-muted-foreground hover:text-foreground"
          >
            Passer cette étape
          </button>
        </div>
      )}
    </div>
  );
}

export default CertificateUpload;
