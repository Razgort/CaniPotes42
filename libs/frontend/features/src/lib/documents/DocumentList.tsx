import { useState, useDeferredValue } from 'react';
import { FileText, FileBadge, FileHeart, Award, File, Eye, Download, Trash2, Search } from 'lucide-react';
import { toast, cn } from '@org/ui';
import { DocumentType } from '@org/types';
import { useDocuments, useDeleteDocument, type DocumentDto } from './hooks/useDocuments';
import { DocumentViewer } from './DocumentViewer';

// --- Expiry badge logic ---

function getExpiryStatus(expiryDate: string | null): 'none' | 'expiring-soon' | 'expired' {
  if (!expiryDate) return 'none';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);

  if (expiry < today) return 'expired';
  const thirtyDaysFromNow = new Date(today);
  thirtyDaysFromNow.setDate(today.getDate() + 30);
  if (expiry <= thirtyDaysFromNow) return 'expiring-soon';
  return 'none';
}

function ExpiryBadge({ expiryDate }: { expiryDate: string | null }) {
  const status = getExpiryStatus(expiryDate);

  if (status === 'none') return null;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        status === 'expired' && 'bg-danger-light text-danger',
        status === 'expiring-soon' && 'bg-warning-light text-warning',
      )}
      aria-label={status === 'expired' ? 'Document expiré' : 'Document expire bientôt'}
    >
      {status === 'expired' ? 'Expiré' : 'Expire bientôt'}
    </span>
  );
}

// --- Document type icons ---

const TYPE_ICONS: Record<DocumentType, React.ElementType> = {
  [DocumentType.REGISTRATION_FORM]: FileBadge,
  [DocumentType.VACCINE_CERTIFICATE]: FileHeart,
  [DocumentType.HEALTH_RECORD]: FileHeart,
  [DocumentType.LICENSE]: Award,
  [DocumentType.OTHER]: File,
};

const TYPE_LABELS: Record<DocumentType, string> = {
  [DocumentType.REGISTRATION_FORM]: 'Formulaire d\'inscription',
  [DocumentType.VACCINE_CERTIFICATE]: 'Certificat de vaccination',
  [DocumentType.HEALTH_RECORD]: 'Carnet de santé',
  [DocumentType.LICENSE]: 'Licence',
  [DocumentType.OTHER]: 'Autre',
};

// --- Row skeleton ---

function DocumentRowSkeleton() {
  return (
    <div className="flex animate-pulse items-center gap-3 rounded-lg border border-border p-4">
      <div className="h-10 w-10 rounded-lg bg-muted" />
      <div className="flex flex-1 flex-col gap-2">
        <div className="h-4 w-2/3 rounded bg-muted" />
        <div className="h-3 w-1/3 rounded bg-muted" />
      </div>
      <div className="h-6 w-20 rounded-full bg-muted" />
    </div>
  );
}

// --- Document row ---

interface DocumentRowProps {
  document: DocumentDto;
  clubId: string;
  canDelete: boolean;
  showMemberName?: boolean;
}

function DocumentRow({ document, clubId, canDelete, showMemberName }: DocumentRowProps) {
  const { mutate: deleteDocument, isPending: isDeleting } = useDeleteDocument(clubId);
  const [viewerOpen, setViewerOpen] = useState(false);

  const Icon = TYPE_ICONS[document.type as DocumentType] ?? FileText;
  const typeLabel = TYPE_LABELS[document.type as DocumentType] ?? document.type;

  const associationLabel = document.dogName
    ? `Chien : ${document.dogName}`
    : document.dog?.name
    ? `Chien : ${document.dog.name}`
    : 'Moi';

  const uploadDate = new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(document.createdAt));

  function handleDelete() {
    if (!confirm('Supprimer ce document ?')) return;
    deleteDocument(
      { documentId: document.id },
      {
        onSuccess: () => toast.success('Document supprimé'),
        onError: () => toast.error("Nous n'avons pas pu supprimer ce document — réessayez"),
      },
    );
  }

  // Determine expiry badge based on server-computed expiryStatus or local fallback
  const serverStatus = document.expiryStatus;
  const badgeStatus: 'none' | 'expiring-soon' | 'expired' = serverStatus === 'expired'
    ? 'expired'
    : serverStatus === 'expiring'
    ? 'expiring-soon'
    : getExpiryStatus(document.expiryDate);

  return (
    <>
    <div className="flex items-center gap-3 rounded-lg border border-border p-4 hover:bg-muted/40">
      {/* Icon */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>

      {/* Details */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-medium">{typeLabel}</span>
          {badgeStatus !== 'none' && (
            <span
              className={cn(
                'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                badgeStatus === 'expired' && 'bg-red-100 text-red-700',
                badgeStatus === 'expiring-soon' && 'bg-amber-100 text-amber-700',
              )}
              aria-label={badgeStatus === 'expired' ? 'Document expiré' : 'Document expire bientôt'}
            >
              {badgeStatus === 'expired' ? 'Expiré' : 'Expire bientôt'}
            </span>
          )}
        </div>
        <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          {showMemberName && document.memberName && (
            <span className="font-medium text-foreground/70">{document.memberName}</span>
          )}
          <span>{document.fileName}</span>
          <span>{associationLabel}</span>
          <span>{uploadDate}</span>
          {document.expiryDate && (
            <span>
              Expiration :{' '}
              {new Intl.DateTimeFormat('fr-FR').format(new Date(document.expiryDate))}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1">
        {/* View inline */}
        <button
          type="button"
          onClick={() => setViewerOpen(true)}
          className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label={`Ouvrir ${typeLabel}`}
        >
          <Eye className="h-4 w-4" />
        </button>
        {/* Download */}
        <a
          href={document.fileUrl}
          download={document.fileName}
          className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label={`Télécharger ${typeLabel}`}
        >
          <Download className="h-4 w-4" />
        </a>
        {canDelete && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
            aria-label={`Supprimer ${typeLabel}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>

      {viewerOpen && (
        <DocumentViewer
          fileName={document.fileName}
          fileUrl={document.fileUrl}
          onClose={() => setViewerOpen(false)}
        />
      )}
    </>
  );
}

// --- DocumentList ---

interface DocumentListProps {
  clubId: string;
  userId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  dogId?: string;
  onUploadClick?: () => void;
}

export function DocumentList({ clubId, userId, role, dogId, onUploadClick }: DocumentListProps) {
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const isAdminOrOwner = role === 'ADMIN' || role === 'OWNER';

  const { data, isLoading } = useDocuments(clubId, {
    dogId,
    search: isAdminOrOwner && deferredSearch ? deferredSearch : undefined,
  });

  const documents = data?.data ?? [];

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3" aria-label="Chargement des documents">
        {Array.from({ length: 3 }).map((_, i) => (
          <DocumentRowSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Admin search bar */}
      {isAdminOrOwner && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher par membre ou type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Rechercher des documents"
            className="w-full rounded-lg border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      )}

      {documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
          <div className="text-4xl">📄</div>
          <div>
            <p className="font-medium">Aucun document</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {search ? 'Aucun résultat pour cette recherche.' : 'Ajoutez votre premier document.'}
            </p>
          </div>
          {onUploadClick && !search && (
            <button
              type="button"
              onClick={onUploadClick}
              className="min-h-[44px] rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Ajouter un document
            </button>
          )}
        </div>
      ) : (
        documents.map((doc) => (
          <DocumentRow
            key={doc.id}
            document={doc}
            clubId={clubId}
            canDelete={isAdminOrOwner || doc.user?.id === userId}
            showMemberName={isAdminOrOwner}
          />
        ))
      )}
    </div>
  );
}
