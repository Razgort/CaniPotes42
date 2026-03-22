import { useState } from 'react';
import { CreditCard, Building2, ChevronLeft, ChevronRight } from 'lucide-react';
import { SkeletonList, cn } from '@org/ui';
import { usePaymentHistory } from './hooks/usePayments';
import type { PaymentHistoryItem } from './hooks/usePayments';

const STATUS_LABELS: Record<string, string> = {
  COMPLETED: 'Payé',
  PENDING: 'En attente',
  FAILED: 'Échoué',
  REFUNDED: 'Remboursé',
};

const STATUS_BADGE_CLASSES: Record<string, string> = {
  COMPLETED: 'bg-green-100 text-green-800',
  PENDING: 'bg-amber-100 text-amber-800',
  FAILED: 'bg-gray-100 text-gray-700',
  REFUNDED: 'bg-gray-100 text-gray-700',
};

function formatAmount(amount: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(dateStr));
}

function ProviderIcon({ provider }: { provider: string }) {
  return provider === 'STRIPE' ? (
    <CreditCard className="inline h-4 w-4 text-indigo-600" aria-label="Stripe" />
  ) : (
    <Building2 className="inline h-4 w-4 text-orange-600" aria-label="HelloAsso" />
  );
}

interface PaymentHistoryProps {
  clubId: string;
}

export function PaymentHistory({ clubId }: PaymentHistoryProps) {
  const [page, setPage] = useState(1);
  const [season, setSeason] = useState('');
  const [sortAsc, setSortAsc] = useState(false);

  const { data, isLoading } = usePaymentHistory(clubId, {
    page,
    pageSize: 20,
    season: season || undefined,
  });

  const payments = data?.data ?? [];
  const meta = data?.meta;
  const totalPages = meta ? Math.ceil(meta.total / meta.pageSize) : 1;

  // Collect seasons from the current page data for the season filter
  const seasons = Array.from(new Set(payments.map((p) => p.season))).sort().reverse();

  // Client-side date sort (acceptable at MVP scale — 200 users max)
  const sorted = [...payments].sort((a, b) => {
    const aDate = new Date(a.createdAt).getTime();
    const bDate = new Date(b.createdAt).getTime();
    return sortAsc ? aDate - bDate : bDate - aDate;
  });

  if (isLoading) {
    return <SkeletonList count={5} />;
  }

  return (
    <div className="space-y-4">
      {/* Season filter */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={season}
          onChange={(e) => {
            setSeason(e.target.value);
            setPage(1);
          }}
          className="rounded-md border px-3 py-2 text-sm"
          aria-label="Filtrer par saison"
        >
          <option value="">Toutes les saisons</option>
          {seasons.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {payments.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-500">
          Aucun paiement à afficher
        </p>
      ) : (
        <>
          {/* Desktop table (lg: and above) */}
          <div className="hidden overflow-x-auto rounded-lg border lg:block">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">Membre</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">Licence</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">Saison</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-700">Montant</th>
                  <th
                    className="px-4 py-3 text-left font-medium text-gray-700 cursor-pointer select-none"
                    onClick={() => setSortAsc((v) => !v)}
                    aria-sort={sortAsc ? 'ascending' : 'descending'}
                  >
                    Date {sortAsc ? '↑' : '↓'}
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">Statut</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">Prestataire</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {sorted.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900">
                      {payment.memberName}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                      {payment.licenseTypeName}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-500">
                      {payment.season}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-medium">
                      {formatAmount(payment.amount)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-500">
                      {formatDate(payment.paymentDate ?? payment.createdAt)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', STATUS_BADGE_CLASSES[payment.status])}>
                        {STATUS_LABELS[payment.status]}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <ProviderIcon provider={payment.provider} />
                      <span className="ml-1 text-gray-600">
                        {payment.provider === 'STRIPE' ? 'Stripe' : 'HelloAsso'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card list (below lg) */}
          <div className="space-y-3 lg:hidden">
            {sorted.map((payment) => (
              <PaymentCard key={payment.id} payment={payment} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
                Précédent
              </button>
              <span className="text-sm text-gray-600">
                Page {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm disabled:opacity-40"
              >
                Suivant
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PaymentCard({ payment }: { payment: PaymentHistoryItem }) {
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium text-gray-900">{payment.memberName}</p>
          <p className="text-sm text-gray-500">{payment.licenseTypeName} — {payment.season}</p>
        </div>
        <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', STATUS_BADGE_CLASSES[payment.status])}>
          {STATUS_LABELS[payment.status]}
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="font-medium">{formatAmount(payment.amount)}</span>
        <span className="text-gray-500">{formatDate(payment.paymentDate ?? payment.createdAt)}</span>
        <div className="flex items-center gap-1 text-gray-600">
          <ProviderIcon provider={payment.provider} />
          <span>{payment.provider === 'STRIPE' ? 'Stripe' : 'HelloAsso'}</span>
        </div>
      </div>
    </div>
  );
}
