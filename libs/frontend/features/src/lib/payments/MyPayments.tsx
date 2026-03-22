import { CreditCard, Building2 } from 'lucide-react';
import { SkeletonList, cn } from '@org/ui';
import { useMyPayments } from './hooks/usePayments';
import type { MyPaymentItem } from './hooks/usePayments';

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

interface MyPaymentsProps {
  clubId: string;
}

export function MyPayments({ clubId }: MyPaymentsProps) {
  const { data, isLoading } = useMyPayments(clubId);

  const payments = data?.data ?? [];

  if (isLoading) {
    return <SkeletonList count={3} />;
  }

  if (payments.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">Vous n'avez effectué aucun paiement</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {payments.map((payment) => (
        <MyPaymentCard key={payment.id} payment={payment} />
      ))}
    </div>
  );
}

function MyPaymentCard({ payment }: { payment: MyPaymentItem }) {
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium text-gray-900">{payment.licenseTypeName}</p>
          <p className="text-sm text-gray-500">{payment.season}</p>
        </div>
        <span
          className={cn(
            'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold',
            STATUS_BADGE_CLASSES[payment.status],
          )}
        >
          {STATUS_LABELS[payment.status]}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-4 text-sm">
        <span className="font-semibold text-gray-900">{formatAmount(payment.amount)}</span>
        <span className="text-gray-500">
          {formatDate(payment.paymentDate ?? payment.createdAt)}
        </span>
        <div className="ml-auto flex items-center gap-1 text-gray-600">
          {payment.provider === 'STRIPE' ? (
            <CreditCard className="h-4 w-4 text-indigo-600" aria-hidden="true" />
          ) : (
            <Building2 className="h-4 w-4 text-orange-600" aria-hidden="true" />
          )}
          <span>{payment.provider === 'STRIPE' ? 'Stripe' : 'HelloAsso'}</span>
        </div>
      </div>

      {payment.transactionId && (
        <p className="mt-2 truncate font-mono text-xs text-gray-400">
          Réf. {payment.transactionId}
        </p>
      )}
    </div>
  );
}
