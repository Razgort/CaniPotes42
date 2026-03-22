import { X, Download, ExternalLink } from 'lucide-react';
import { cn } from '@org/ui';

interface DocumentViewerProps {
  fileName: string;
  fileUrl: string;
  onClose: () => void;
}

type FileKind = 'image' | 'pdf' | 'other';

function detectKind(fileName: string): FileKind {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) return 'image';
  if (ext === 'pdf') return 'pdf';
  return 'other';
}

export function DocumentViewer({ fileName, fileUrl, onClose }: DocumentViewerProps) {
  const kind = detectKind(fileName);

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Visualisation : ${fileName}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-background shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="truncate text-sm font-medium">{fileName}</span>
          <div className="flex shrink-0 items-center gap-1">
            {/* Open in new tab */}
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center',
                'rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
              aria-label="Ouvrir dans un nouvel onglet"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
            {/* Download */}
            <a
              href={fileUrl}
              download={fileName}
              className={cn(
                'flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center',
                'rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
              aria-label={`Télécharger ${fileName}`}
            >
              <Download className="h-4 w-4" />
            </a>
            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className={cn(
                'flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center',
                'rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto bg-muted/30">
          {kind === 'image' && (
            <img
              src={fileUrl}
              alt={fileName}
              className="mx-auto block max-h-[75vh] w-auto object-contain p-4"
            />
          )}
          {kind === 'pdf' && (
            <iframe
              src={fileUrl}
              title={fileName}
              className="h-[75vh] w-full border-0"
            />
          )}
          {kind === 'other' && (
            <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
              <p className="text-sm text-muted-foreground">
                Aperçu non disponible pour ce type de fichier.
              </p>
              <a
                href={fileUrl}
                download={fileName}
                className={cn(
                  'flex min-h-[44px] items-center gap-2 rounded-lg bg-primary',
                  'px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90',
                )}
              >
                <Download className="h-4 w-4" />
                Télécharger
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
