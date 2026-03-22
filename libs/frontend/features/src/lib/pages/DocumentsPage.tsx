import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useAuth } from '@org/data-access';
import { DocumentList } from '../documents/DocumentList';
import { UploadForm } from '../documents/UploadForm';

export default function DocumentsPage() {
  const { activeClub, role, user } = useAuth();
  const clubId = activeClub?.id ?? null;
  const userId = user?.id ?? '';
  const userRole = (role ?? 'MEMBER') as 'OWNER' | 'ADMIN' | 'MEMBER';

  const [showUploadForm, setShowUploadForm] = useState(false);

  if (!clubId) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <p className="text-muted-foreground">Sélectionnez un club pour voir les documents.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Documents</h1>
        <button
          type="button"
          onClick={() => setShowUploadForm((prev) => !prev)}
          className="flex min-h-[44px] items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          aria-expanded={showUploadForm}
        >
          {showUploadForm ? (
            <>
              <X className="h-4 w-4" />
              Fermer
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              Ajouter
            </>
          )}
        </button>
      </div>

      {/* Upload form — slides in from top when open (sheet-like on mobile) */}
      {showUploadForm && (
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <UploadForm
            clubId={clubId}
            onSuccess={() => setShowUploadForm(false)}
            onCancel={() => setShowUploadForm(false)}
          />
        </div>
      )}

      {/* Document list */}
      <DocumentList
        clubId={clubId}
        userId={userId}
        role={userRole}
        onUploadClick={() => setShowUploadForm(true)}
      />
    </div>
  );
}
