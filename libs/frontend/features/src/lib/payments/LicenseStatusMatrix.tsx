import { useState, useDeferredValue } from 'react';
import { Search, CreditCard, Building2 } from 'lucide-react';
import { SkeletonList, cn } from '@org/ui';
import { useLicenseStatus } from './hooks/usePayments';
import type { LicenseStatusFilters, MemberPaymentCell } from './hooks/usePayments';
import { PaymentDetailSheet } from './PaymentDetailSheet';

const STATUS_OPTIONS = [
  { label: 'Tous les statuts', value: 'ALL' },
  { label: 'Payé', value: 'PAID' },
  { label: 'En attente', value: 'PENDING' },
  { label: 'Non payé', value: 'UNPAID' },
] as const;

const PROVIDER_OPTIONS = [
  { label: 'Tous les prestataires', value: 'ALL' },
  { label: 'Stripe', value: 'STRIPE' },
  { label: 'HelloAsso', value: 'HELLOASSO' },
] as const;

const STATUS_CELL_CLASSES: Record<string, string> = {
  COMPLETED: 'bg-green-100 text-green-800',
  PENDING: 'bg-amber-100 text-amber-800',
  FAILED: 'bg-gray-100 text-gray-700',
  REFUNDED: 'bg-gray-100 text-gray-700',
};

const STATUS_CELL_LABELS: Record<string, string> = {
  COMPLETED: 'Payé',
  PENDING: 'En attente',
  FAILED: 'Échoué',
  REFUNDED: 'Remboursé',
};

interface DetailState {
  memberName: string;
  payment: MemberPaymentCell;
}

interface LicenseStatusMatrixProps {
  clubId: string;
}

export function LicenseStatusMatrix({ clubId }: LicenseStatusMatrixProps) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<LicenseStatusFilters['status']>('ALL');
  const [provider, setProvider] = useState<LicenseStatusFilters['provider']>('ALL');
  const [season, setSeason] = useState('');
  const [detail, setDetail] = useState<DetailState | null>(null);

  const deferredSearch = useDeferredValue(search);

  const { data, isLoading } = useLicenseStatus(clubId, {
    search: deferredSearch || undefined,
    status,
    provider,
    season: season || undefined,
  });

  const rows = data?.data ?? [];
  const licenseTypes = data?.licenseTypes ?? [];

  // Collect unique seasons from license types for the filter dropdown
  const seasons = Array.from(new Set(licenseTypes.map((lt) => lt.season))).sort().reverse();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          {/* Skeleton filter bar */}
          <div className="h-9 w-32 animate-pulse rounded-md bg-gray-200" />
          <div className="h-9 w-32 animate-pulse rounded-md bg-gray-200" />
          <div className="h-9 flex-1 animate-pulse rounded-md bg-gray-200" />
        </div>
        {/* Skeleton table rows */}
        <div className="overflow-hidden rounded-lg border">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4 border-b px-4 py-3">
              <div className="h-4 w-36 animate-pulse rounded bg-gray-200" />
              {Array.from({ length: licenseTypes.length || 2 }).map((_, j) => (
                <div key={j} className="h-6 w-20 animate-pulse rounded-full bg-gray-200" />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap gap-2">
        {seasons.length > 0 && (
          <select
            value={season}
            onChange={(e) => setSeason(e.target.value)}
            className="rounded-md border px-3 py-2 text-sm"
            aria-label="Filtrer par saison"
          >
            <option value="">Toutes les saisons</option>
            {seasons.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        )}

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as LicenseStatusFilters['status'])}
          className="rounded-md border px-3 py-2 text-sm"
          aria-label="Filtrer par statut"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value as LicenseStatusFilters['provider'])}
          className="rounded-md border px-3 py-2 text-sm"
          aria-label="Filtrer par prestataire"
        >
          {PROVIDER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un membre…"
            className="w-full rounded-md border py-2 pl-9 pr-3 text-sm"
          />
        </div>
      </div>

      {/* Table */}
      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-500">
          Aucun paiement enregistré pour cette saison
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Membre</th>
                {licenseTypes.map((lt) => (
                  <th key={lt.id} className="px-4 py-3 text-center font-medium text-gray-700 whitespace-nowrap">
                    <div>{lt.name}</div>
                    <div className="text-xs font-normal text-gray-500">{lt.season}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {rows.map((row) => (
                <tr key={row.memberId} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">
                    {row.memberName}
                  </td>
                  {row.payments.map((cell) => (
                    <td key={cell.licenseTypeId} className="px-4 py-3 text-center">
                      <button
                        onClick={() =>
                          cell.paymentId
                            ? setDetail({ memberName: row.memberName, payment: cell })
                            : undefined
                        }
                        disabled={!cell.paymentId}
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
                          cell.status
                            ? STATUS_CELL_CLASSES[cell.status]
                            : 'bg-gray-100 text-gray-500',
                          cell.paymentId && 'cursor-pointer hover:opacity-80',
                        )}
                        aria-label={
                          cell.status
                            ? `${row.memberName} — ${cell.licenseTypeName} : ${STATUS_CELL_LABELS[cell.status]}`
                            : `${row.memberName} — ${cell.licenseTypeName} : Non payé`
                        }
                      >
                        {/* Provider icon only for paid entries */}
                        {cell.status === 'COMPLETED' && (
                          cell.provider === 'STRIPE' ? (
                            <CreditCard className="h-3 w-3" aria-hidden="true" />
                          ) : (
                            <Building2 className="h-3 w-3" aria-hidden="true" />
                          )
                        )}
                        {cell.status ? STATUS_CELL_LABELS[cell.status] : 'Non payé'}
                      </button>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Payment detail sheet */}
      {detail && (
        <PaymentDetailSheet
          open={!!detail}
          onClose={() => setDetail(null)}
          memberName={detail.memberName}
          payment={detail.payment}
        />
      )}
    </div>
  );
}
