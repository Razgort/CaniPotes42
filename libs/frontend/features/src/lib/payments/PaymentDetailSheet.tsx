import { X, CreditCard, Building2 } from 'lucide-react';
import { cn } from '@org/ui';
import type { MemberPaymentCell } from './hooks/usePayments';

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  COMPLETED: 'Payé',
  PENDING: 'En attente',
  FAILED: 'Échoué',
  REFUNDED: 'Remboursé',
};

const PAYMENT_STATUS_CLASSES: Record<string, string> = {
  COMPLETED: 'bg-green-100 text-green-800',
  PENDING: 'bg-amber-100 text-amber-800',
  FAILED: 'bg-gray-100 text-gray-700',
  REFUNDED: 'bg-gray-100 text-gray-700',
};

function formatAmount(amount: number | null): string {
  if (amount === null) return '—';
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(dateStr));
}

interface PaymentDetailSheetProps {
  open: boolean;
  onClose: () => void;
  memberName: string;
  payment: MemberPaymentCell;
}

export function PaymentDetailSheet({ open, onClose, memberName, payment }: PaymentDetailSheetProps) {
  if (!open) return null;

  const statusLabel = payment.status ? PAYMENT_STATUS_LABELS[payment.status] : 'Non payé';
  const statusClass = payment.status ? PAYMENT_STATUS_CLASSES[payment.status] : 'bg-gray-100 text-gray-700';
  const transactionLabel = payment.provider === 'STRIPE' ? 'Référence Stripe' : 'Référence HelloAsso';

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet — slide-up on mobile, side panel on desktop */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Détail du paiement"
        className={cn(
          'fixed z-50 bg-white shadow-xl',
          // Mobile: slide up from bottom
          'bottom-0 left-0 right-0 rounded-t-2xl',
          // Desktop: side panel from right
          'lg:bottom-auto lg:top-0 lg:right-0 lg:left-auto lg:h-full lg:w-96 lg:rounded-none',
        )}
      >
        <div className="flex items-center justify-between border-b px-4 py-4">
          <h2 className="text-base font-semibold">Détail du paiement</h2>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="rounded-md p-1 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-4 py-4">
          {/* Member */}
          <div>
            <p className="text-xs text-gray-500">Membre</p>
            <p className="font-medium">{memberName}</p>
          </div>

          {/* License type */}
          <div>
            <p className="text-xs text-gray-500">Type de licence</p>
            <p className="font-medium">{payment.licenseTypeName}</p>
            <p className="text-sm text-gray-500">{payment.season}</p>
          </div>

          {/* Status badge */}
          <div>
            <p className="text-xs text-gray-500">Statut</p>
            <span className={cn('mt-1 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold', statusClass)}>
              {statusLabel}
            </span>
          </div>

          {/* Amount */}
          <div>
            <p className="text-xs text-gray-500">Montant</p>
            <p className="font-medium">{formatAmount(payment.amount)}</p>
          </div>

          {/* Payment date */}
          <div>
            <p className="text-xs text-gray-500">Date de paiement</p>
            <p className="font-medium">{formatDate(payment.paymentDate)}</p>
          </div>

          {/* Provider */}
          <div>
            <p className="text-xs text-gray-500">Prestataire de paiement</p>
            <div className="mt-1 flex items-center gap-2">
              {payment.provider === 'STRIPE' ? (
                <CreditCard className="h-4 w-4 text-indigo-600" />
              ) : (
                <Building2 className="h-4 w-4 text-orange-600" />
              )}
              <span className="text-sm font-medium">
                {payment.provider === 'STRIPE' ? 'Stripe' : 'HelloAsso'}
              </span>
            </div>
          </div>

          {/* Transaction ID */}
          {payment.transactionId && (
            <div>
              <p className="text-xs text-gray-500">{transactionLabel}</p>
              <p className="break-all font-mono text-xs text-gray-700">{payment.transactionId}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
