import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from '@org/ui';
import {
  useLicenseTypes,
  useCreateLicenseType,
  useUpdateLicenseType,
  useDeleteLicenseType,
} from './hooks/useLicenseTypes';
import type { LicenseTypeDto } from './hooks/useLicenseTypes';
import { LicenseTypeForm, licenseTypeToDtoDefaults } from './LicenseTypeForm';
import type { CreateLicenseType } from '@org/types';

interface LicenseTypeListProps {
  clubId: string;
}

function ProviderBadge({ provider }: { provider: 'STRIPE' | 'HELLOASSO' }) {
  const label = provider === 'STRIPE' ? 'Stripe' : 'HelloAsso';
  const className =
    provider === 'STRIPE'
      ? 'inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary'
      : 'inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground';
  return <span className={className}>{label}</span>;
}

function DeleteConfirmDialog({
  onConfirm,
  onCancel,
  isPending,
}: {
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-sm rounded-2xl bg-background p-6 shadow-xl">
        <h2 className="text-base font-semibold mb-2">Supprimer ce type de licence ?</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Les paiements existants ne seront pas affectés.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-accent/50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="flex-1 rounded-lg bg-destructive px-4 py-2.5 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
          >
            {isPending ? 'Suppression...' : 'Supprimer'}
          </button>
        </div>
      </div>
    </div>
  );
}

function SheetPanel({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm bg-background shadow-xl flex flex-col">
        <div className="flex items-center justify-between border-b px-4 py-4">
          <h2 className="text-base font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 hover:bg-accent/50 text-muted-foreground"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}

export function LicenseTypeList({ clubId }: LicenseTypeListProps) {
  const { data, isLoading } = useLicenseTypes(clubId);
  const createMutation = useCreateLicenseType(clubId);
  const updateMutation = useUpdateLicenseType(clubId);
  const deleteMutation = useDeleteLicenseType(clubId);

  const [sheetMode, setSheetMode] = useState<'none' | 'create' | 'edit'>('none');
  const [editingLicense, setEditingLicense] = useState<LicenseTypeDto | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const licenseTypes = data?.data ?? [];

  const handleCreate = (dto: CreateLicenseType) => {
    createMutation.mutate(dto, {
      onSuccess: () => setSheetMode('none'),
      onError: (err) => toast.error(err.message),
    });
  };

  const handleUpdate = (dto: CreateLicenseType) => {
    if (!editingLicense) return;
    updateMutation.mutate(
      { id: editingLicense.id, data: dto },
      {
        onSuccess: () => {
          setSheetMode('none');
          setEditingLicense(null);
        },
        onError: (err) => toast.error(err.message),
      },
    );
  };

  const handleDelete = () => {
    if (!deletingId) return;
    deleteMutation.mutate(deletingId, {
      onSuccess: () => setDeletingId(null),
      onError: (err) => {
        toast.error(err.message);
        setDeletingId(null);
      },
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Types de licences</h1>
        <button
          type="button"
          onClick={() => setSheetMode('create')}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Ajouter
        </button>
      </div>

      {licenseTypes.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-12 text-center">
          <p className="text-sm text-muted-foreground">
            Aucun type de licence configuré. Ajoutez votre premier type de licence.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {licenseTypes.map((lt) => (
            <div
              key={lt.id}
              className="flex items-center justify-between rounded-xl border bg-card p-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{lt.name}</span>
                  <ProviderBadge provider={lt.paymentProvider} />
                </div>
                <p className="text-sm text-muted-foreground">
                  {Number(lt.amount)} € · {lt.season}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Modifier"
                  onClick={() => {
                    setEditingLicense(lt);
                    setSheetMode('edit');
                  }}
                  className="rounded-md p-2 hover:bg-accent/50"
                >
                  <Pencil className="h-4 w-4 text-muted-foreground" />
                </button>
                <button
                  type="button"
                  aria-label="Supprimer"
                  onClick={() => setDeletingId(lt.id)}
                  className="rounded-md p-2 hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {sheetMode !== 'none' && (
        <SheetPanel
          title={sheetMode === 'create' ? 'Ajouter un type de licence' : 'Modifier le type de licence'}
          onClose={() => {
            setSheetMode('none');
            setEditingLicense(null);
          }}
        >
          <LicenseTypeForm
            mode={sheetMode}
            defaultValues={
              sheetMode === 'edit' && editingLicense
                ? licenseTypeToDtoDefaults(editingLicense)
                : undefined
            }
            onSubmit={sheetMode === 'create' ? handleCreate : handleUpdate}
            isPending={createMutation.isPending || updateMutation.isPending}
            onCancel={() => {
              setSheetMode('none');
              setEditingLicense(null);
            }}
          />
        </SheetPanel>
      )}

      {deletingId && (
        <DeleteConfirmDialog
          onConfirm={handleDelete}
          onCancel={() => setDeletingId(null)}
          isPending={deleteMutation.isPending}
        />
      )}
    </div>
  );
}
