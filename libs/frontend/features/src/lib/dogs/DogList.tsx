import { useNavigate } from 'react-router-dom';
import { PawPrint, Plus } from 'lucide-react';
import { useAuth } from '@org/data-access';
import { SkeletonList, cn } from '@org/ui';
import { useDogs } from './hooks/useDogs';

export function DogList() {
  const navigate = useNavigate();
  const { activeClub } = useAuth();
  const clubId = activeClub?.id ?? null;

  const { data, isLoading } = useDogs(clubId);
  const dogs = data?.data ?? [];

  if (isLoading) return <SkeletonList />;

  if (dogs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <PawPrint className="h-12 w-12 text-muted-foreground/40" aria-hidden="true" />
        <p className="text-muted-foreground">Ajoutez votre premier chien pour commencer</p>
        <button
          type="button"
          onClick={() => navigate('/dogs/new')}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Ajouter un chien
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Mes chiens</h1>
        <button
          type="button"
          onClick={() => navigate('/dogs/new')}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Ajouter
        </button>
      </div>

      <div className="space-y-2">
        {dogs.map((dog) => (
          <button
            key={dog.id}
            type="button"
            onClick={() => navigate(`/dogs/${dog.id}`)}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg border bg-card p-3 text-left',
              'transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            )}
            aria-label={`Voir le profil de ${dog.name}`}
          >
            {/* Avatar */}
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
              {dog.photoUrl ? (
                <img
                  src={dog.photoUrl}
                  alt={dog.name}
                  className="h-12 w-12 rounded-full object-cover"
                />
              ) : (
                <PawPrint className="h-6 w-6 text-primary" aria-hidden="true" />
              )}
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{dog.name}</p>
              {dog.breed && (
                <p className="truncate text-sm text-muted-foreground">{dog.breed}</p>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default DogList;
