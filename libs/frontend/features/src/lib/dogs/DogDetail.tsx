import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, PawPrint, Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '@org/data-access';
import { SkeletonList, VaccineStatusBadge, toast } from '@org/ui';
import { useDogDetail, useDeleteDog } from './hooks/useDogs';
import { useVaccines } from './hooks/useVaccines';
import { VaccineList } from './VaccineList';
import { VaccineForm } from './VaccineForm';
import { CertificateUpload } from './CertificateUpload';
import { calculateDogOverallStatus } from './utils/vaccineStatus';
import type { VaccineDto } from './hooks/useVaccines';

type VaccineView =
  | { mode: 'list' }
  | { mode: 'add' }
  | { mode: 'edit'; vaccine: VaccineDto }
  | { mode: 'certificate'; vaccineId: string; vaccineName: string };

export function DogDetail() {
  const navigate = useNavigate();
  const { dogId } = useParams<{ dogId: string }>();
  const { activeClub, user } = useAuth();
  const clubId = activeClub?.id ?? null;

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [vaccineView, setVaccineView] = useState<VaccineView>({ mode: 'list' });

  const { data, isLoading } = useDogDetail(clubId, dogId);
  const deleteDog = useDeleteDog(clubId);
  const { data: vaccines = [] } = useVaccines(clubId, dogId);

  const dog = data?.data;
  const isOwner = dog?.userId === user?.id;
  const overallStatus = calculateDogOverallStatus(vaccines);

  if (isLoading) return <SkeletonList />;

  if (!dog) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        Chien introuvable
      </div>
    );
  }

  const handleDelete = async () => {
    try {
      await deleteDog.mutateAsync({ dogId: dog.id });
      toast.success('Chien retiré');
      navigate('/dogs');
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  const formattedBirthdate = dog.birthdate
    ? new Date(dog.birthdate).toLocaleDateString('fr-FR')
    : null;

  return (
    <div className="space-y-6">
      {/* Back navigation */}
      <button
        type="button"
        onClick={() => navigate('/dogs')}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        aria-label="Retour à la liste des chiens"
      >
        <ArrowLeft className="h-4 w-4" />
        Mes chiens
      </button>

      {/* Dog header */}
      <div className="flex items-center gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-primary/10">
          {dog.photoUrl ? (
            <img
              src={dog.photoUrl}
              alt={dog.name}
              className="h-20 w-20 rounded-full object-cover"
            />
          ) : (
            <PawPrint className="h-10 w-10 text-primary" aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold">{dog.name}</h1>
          {dog.breed && <p className="text-muted-foreground">{dog.breed}</p>}
          <div className="mt-1">
            <VaccineStatusBadge status={overallStatus} />
          </div>
        </div>
      </div>

      {/* Dog details */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <h2 className="font-medium">Informations</h2>
        {formattedBirthdate && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Date de naissance</span>
            <span>{formattedBirthdate}</span>
          </div>
        )}
        {dog.chipNumber && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">N° de puce</span>
            <span className="font-mono text-xs">{dog.chipNumber}</span>
          </div>
        )}
        {dog.owner && !isOwner && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Propriétaire</span>
            <span>{dog.owner.firstName} {dog.owner.lastName}</span>
          </div>
        )}
      </div>

      {/* Vaccine section */}
      {vaccineView.mode === 'add' && (
        <VaccineForm
          clubId={clubId}
          dogId={dog.id}
          dogName={dog.name}
          onSuccess={(vaccine) =>
            setVaccineView({
              mode: 'certificate',
              vaccineId: vaccine.id,
              vaccineName: vaccine.vaccineName,
            })
          }
          onCancel={() => setVaccineView({ mode: 'list' })}
        />
      )}

      {vaccineView.mode === 'edit' && (
        <VaccineForm
          clubId={clubId}
          dogId={dog.id}
          dogName={dog.name}
          existingVaccine={vaccineView.vaccine}
          onSuccess={() => setVaccineView({ mode: 'list' })}
          onCancel={() => setVaccineView({ mode: 'list' })}
        />
      )}

      {vaccineView.mode === 'certificate' && (
        <CertificateUpload
          clubId={clubId}
          dogId={dog.id}
          vaccineId={vaccineView.vaccineId}
          vaccineName={vaccineView.vaccineName}
          onComplete={() => setVaccineView({ mode: 'list' })}
          onSkip={() => setVaccineView({ mode: 'list' })}
        />
      )}

      {vaccineView.mode === 'list' && (
        <VaccineList
          vaccines={vaccines}
          clubId={clubId}
          dogId={dog.id}
          isOwner={isOwner}
          onAddVaccine={() => setVaccineView({ mode: 'add' })}
          onEditVaccine={(vaccine) => setVaccineView({ mode: 'edit', vaccine })}
        />
      )}

      {/* Owner actions */}
      {isOwner && vaccineView.mode === 'list' && (
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate(`/dogs/${dog.id}/edit`)}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            <Pencil className="h-4 w-4" />
            Modifier
          </button>
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-destructive/30 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
            Retirer
          </button>
        </div>
      )}

      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div className="w-full max-w-sm rounded-xl bg-background p-6 shadow-xl space-y-4">
            <h2 id="delete-dialog-title" className="text-lg font-semibold">
              Retirer {dog.name} ?
            </h2>
            <p className="text-sm text-muted-foreground">
              Les carnets de vaccination et documents associés seront supprimés.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteDog.isPending}
                className="flex-1 rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
              >
                {deleteDog.isPending ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DogDetail;
