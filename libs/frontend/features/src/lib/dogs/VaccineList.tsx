import { useState } from 'react';
import { ExternalLink, Pencil, Trash2 } from 'lucide-react';
import { VaccineStatusBadge } from '@org/ui';
import { toast } from '@org/ui';
import type { VaccineDto } from './hooks/useVaccines';
import { useDeleteVaccine } from './hooks/useVaccines';

interface VaccineListProps {
  vaccines: VaccineDto[];
  clubId: string | null;
  dogId: string;
  isOwner: boolean;
  onAddVaccine: () => void;
  onEditVaccine: (vaccine: VaccineDto) => void;
}

export function VaccineList({
  vaccines,
  clubId,
  dogId,
  isOwner,
  onAddVaccine,
  onEditVaccine,
}: VaccineListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const deleteVaccine = useDeleteVaccine(clubId, dogId);

  const handleDelete = async (vaccineId: string) => {
    try {
      await deleteVaccine.mutateAsync({ vaccineId });
      toast.success('Vaccin supprimé');
    } catch {
      toast.error('Nous n\'avons pas pu supprimer ce vaccin. Veuillez réessayer.');
    } finally {
      setDeletingId(null);
    }
  };

  if (vaccines.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Vaccins</h2>
          {isOwner && (
            <button
              type="button"
              onClick={onAddVaccine}
              className="text-sm text-primary hover:underline"
            >
              + Ajouter
            </button>
          )}
        </div>
        <div className="py-6 text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            Aucun vaccin enregistré
          </p>
          {isOwner && (
            <button
              type="button"
              onClick={onAddVaccine}
              className="inline-flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
            >
              + Ajouter un vaccin
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">Vaccins</h2>
        {isOwner && (
          <button
            type="button"
            onClick={onAddVaccine}
            className="text-sm text-primary hover:underline"
          >
            + Ajouter
          </button>
        )}
      </div>

      <ul className="space-y-3" aria-label="Liste des vaccins">
        {vaccines.map((vaccine) => (
          <li
            key={vaccine.id}
            className="flex items-start gap-3 rounded-lg border p-3"
          >
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">{vaccine.vaccineName}</span>
                <VaccineStatusBadge status={vaccine.status} />
              </div>
              <div className="text-xs text-muted-foreground space-y-0.5">
                <div>
                  Administré le{' '}
                  {new Date(vaccine.dateAdministered).toLocaleDateString('fr-FR')}
                </div>
                {vaccine.expiryDate && (
                  <div>
                    Expire le{' '}
                    {new Date(vaccine.expiryDate).toLocaleDateString('fr-FR')}
                  </div>
                )}
              </div>
              {vaccine.certificateUrl && (
                <a
                  href={vaccine.certificateUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  Voir le certificat
                </a>
              )}
            </div>

            {isOwner && (
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => onEditVaccine(vaccine)}
                  className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                  aria-label={`Modifier ${vaccine.vaccineName}`}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                {deletingId === vaccine.id ? (
                  <div className="rounded p-1">
                    <button
                      type="button"
                      onClick={() => handleDelete(vaccine.id)}
                      disabled={deleteVaccine.isPending}
                      className="text-xs text-destructive hover:underline disabled:opacity-50"
                    >
                      {deleteVaccine.isPending ? '...' : 'Confirmer'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingId(null)}
                      className="ml-1 text-xs text-muted-foreground hover:underline"
                    >
                      Annuler
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setDeletingId(vaccine.id)}
                    className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    aria-label={`Supprimer ${vaccine.vaccineName}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default VaccineList;
