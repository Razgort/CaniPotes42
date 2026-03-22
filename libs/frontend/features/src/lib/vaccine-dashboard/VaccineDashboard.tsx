import { useState, useDeferredValue } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { VaccineStatus } from '@org/types';
import { useAuth } from '@org/data-access';
import { VaccineStatusBadge, VaccineSummaryCards, SkeletonCard, SkeletonList, cn } from '@org/ui';
import type { VaccineStatusValue } from '@org/ui';
import { useVaccineDashboard } from './hooks/useVaccineDashboard';
import type { VaccineDogRow } from './hooks/useVaccineDashboard';

function formatDaysUntilExpiry(days: number | null): string {
  if (days === null) return '—';
  if (days < 0) return `Expiré il y a ${Math.abs(days)} j.`;
  if (days === 0) return 'Expire aujourd\'hui';
  return `${days} j.`;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4" aria-label="Chargement du tableau de bord vaccinal">
      {/* Skeleton KPI cards */}
      <div className="grid grid-cols-3 gap-2 p-4">
        <SkeletonCard height={80} />
        <SkeletonCard height={80} />
        <SkeletonCard height={80} />
      </div>
      {/* Skeleton rows */}
      <div className="space-y-0">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="border-b py-3 px-4">
            <SkeletonList count={2} />
          </div>
        ))}
      </div>
    </div>
  );
}

interface DogRowProps {
  dog: VaccineDogRow;
  onRowClick: (dog: VaccineDogRow) => void;
}

function DogRowCard({ dog, onRowClick }: DogRowProps) {
  return (
    <button
      type="button"
      data-testid="vax-dash-row"
      className="w-full flex items-center gap-3 py-3 px-4 border-b text-left hover:bg-accent/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
      onClick={() => onRowClick(dog)}
    >
      {/* Dog avatar */}
      <div className="shrink-0 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-lg">
        {dog.dogPhotoUrl ? (
          <img
            src={dog.dogPhotoUrl}
            alt=""
            className="h-10 w-10 rounded-full object-cover"
          />
        ) : (
          <span role="img" aria-hidden="true">🐾</span>
        )}
      </div>
      {/* Dog info */}
      <div className="flex-1 min-w-0">
        <p className="text-body font-semibold truncate">{dog.dogName}</p>
        <p className="text-sm text-muted-foreground truncate">
          {dog.ownerFirstName} {dog.ownerLastName}
        </p>
      </div>
      {/* Status + days */}
      <div className="shrink-0 flex flex-col items-end gap-1">
        <VaccineStatusBadge status={dog.overallStatus as VaccineStatusValue} />
        <span className="text-xs text-muted-foreground">
          {formatDaysUntilExpiry(dog.daysUntilExpiry)}
        </span>
      </div>
    </button>
  );
}

interface DogDetailDrawerProps {
  dog: VaccineDogRow;
  onClose: () => void;
  onContactOwner: (memberId: string) => void;
}

function DogDetailDrawer({ dog, onClose, onContactOwner }: DogDetailDrawerProps) {
  return (
    <div
      role="dialog"
      aria-label={`Détail vaccins de ${dog.dogName}`}
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
    >
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-10 w-full max-w-lg bg-background rounded-t-2xl sm:rounded-2xl shadow-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">{dog.dogName}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-accent transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        {/* Owner link */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Propriétaire :</span>
          <button
            type="button"
            onClick={() => onContactOwner(dog.memberId)}
            className="font-medium text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {dog.ownerFirstName} {dog.ownerLastName}
          </button>
        </div>

        {/* Vaccine records */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Vaccins
          </h3>
          {dog.vaccineRecords.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun vaccin enregistré.</p>
          ) : (
            dog.vaccineRecords.map((v) => (
              <div
                key={v.id}
                className="flex items-center justify-between py-2 border-b last:border-0"
              >
                <div>
                  <p className="text-sm font-medium">{v.vaccineName}</p>
                  {v.expiryDate && (
                    <p className="text-xs text-muted-foreground">
                      Expire le {new Date(v.expiryDate).toLocaleDateString('fr-FR')}
                    </p>
                  )}
                </div>
                <VaccineStatusBadge status={v.status as VaccineStatusValue} />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export function VaccineDashboard() {
  const navigate = useNavigate();
  const { activeClub, role } = useAuth();
  const clubId = activeClub?.id ?? null;

  const [statusFilter, setStatusFilter] = useState<VaccineStatus | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedDog, setSelectedDog] = useState<VaccineDogRow | null>(null);

  const deferredSearch = useDeferredValue(search);

  const isAdminOrOwner = role === 'ADMIN' || role === 'OWNER';

  const { data, isLoading, isError } = useVaccineDashboard(isAdminOrOwner ? clubId : null, {
    status: statusFilter ?? undefined,
    search: deferredSearch || undefined,
    page,
  });

  if (!isAdminOrOwner) {
    return (
      <div className="py-6 text-center text-muted-foreground">
        Accès réservé aux administrateurs.
      </div>
    );
  }

  if (isLoading) return <DashboardSkeleton />;

  if (isError) {
    return (
      <div className="py-6 text-center text-red-600">
        Une erreur est survenue. Veuillez réessayer.
      </div>
    );
  }

  const summary = data?.data.summary ?? { ok: 0, warning: 0, critical: 0 };
  const dogs = data?.data.dogs ?? [];
  const meta = data?.meta;

  // Empty state
  if (!isLoading && dogs.length === 0 && !deferredSearch && !statusFilter) {
    return (
      <div className="space-y-0">
        <VaccineSummaryCards
          summary={summary}
          activeFilter={statusFilter as VaccineStatusValue | null}
          onFilterChange={(s) => {
            setStatusFilter(s ? (s as unknown as VaccineStatus) : null);
            setPage(1);
          }}
        />
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
          <div className="text-4xl">🐾</div>
          <p className="text-muted-foreground">Aucun chien enregistré dans le club.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      <div className="px-4 pt-4">
        <h1 className="text-xl font-semibold">Tableau de bord vaccinal</h1>
      </div>

      {/* Summary cards */}
      <VaccineSummaryCards
        summary={summary}
        activeFilter={statusFilter as VaccineStatusValue | null}
        onFilterChange={(s) => {
          setStatusFilter(s ? (s as unknown as VaccineStatus) : null);
          setPage(1);
        }}
      />

      {/* Search + status filter */}
      <div className="px-4 pb-3 space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            data-testid="vax-dash-search"
            placeholder="Chien ou propriétaire…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-lg border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* Dog list — mobile cards */}
      <div className="lg:hidden">
        {dogs.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">Aucun résultat.</p>
        ) : (
          dogs.map((dog) => (
            <DogRowCard key={dog.dogId} dog={dog} onRowClick={setSelectedDog} />
          ))
        )}
      </div>

      {/* Dog list — desktop table */}
      <div className="hidden lg:block px-4">
        {dogs.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">Aucun résultat.</p>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b text-left text-sm text-muted-foreground">
                <th className="pb-2 font-medium">Chien</th>
                <th className="pb-2 font-medium">Propriétaire</th>
                <th className="pb-2 font-medium">Statut</th>
                <th className="pb-2 font-medium">Prochaine échéance</th>
              </tr>
            </thead>
            <tbody>
              {dogs.map((dog) => (
                <tr
                  key={dog.dogId}
                  data-testid="vax-dash-row"
                  className="cursor-pointer border-b transition-colors hover:bg-accent/50"
                  onClick={() => setSelectedDog(dog)}
                >
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm">
                        {dog.dogPhotoUrl ? (
                          <img
                            src={dog.dogPhotoUrl}
                            alt=""
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <span aria-hidden="true">🐾</span>
                        )}
                      </div>
                      <span className="font-semibold">{dog.dogName}</span>
                    </div>
                  </td>
                  <td className="py-3 text-sm text-muted-foreground">
                    {dog.ownerFirstName} {dog.ownerLastName}
                  </td>
                  <td className="py-3">
                    <VaccineStatusBadge status={dog.overallStatus as VaccineStatusValue} />
                  </td>
                  <td className="py-3 text-sm text-muted-foreground">
                    {formatDaysUntilExpiry(dog.daysUntilExpiry)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {meta && meta.total > meta.pageSize && (
        <div className="flex items-center justify-center gap-2 p-4">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-lg border px-3 py-1 text-sm disabled:opacity-50"
          >
            Précédent
          </button>
          <span className="text-sm text-muted-foreground">
            Page {page} / {Math.ceil(meta.total / meta.pageSize)}
          </span>
          <button
            type="button"
            disabled={page >= Math.ceil(meta.total / meta.pageSize)}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border px-3 py-1 text-sm disabled:opacity-50"
          >
            Suivant
          </button>
        </div>
      )}

      {/* Dog detail drawer */}
      {selectedDog && (
        <DogDetailDrawer
          dog={selectedDog}
          onClose={() => setSelectedDog(null)}
          onContactOwner={(memberId) => {
            setSelectedDog(null);
            navigate(`/members/${memberId}`);
          }}
        />
      )}
    </div>
  );
}

export default VaccineDashboard;
