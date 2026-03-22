import { useState } from 'react';
import { useAuth } from '@org/data-access';
import { LicenseStatusMatrix } from '../payments/LicenseStatusMatrix';
import { PaymentHistory } from '../payments/PaymentHistory';
import { MyPayments } from '../payments/MyPayments';

type AdminTab = 'matrix' | 'history';

export default function PaymentsPage() {
  const { activeClub, role } = useAuth();
  const clubId = activeClub?.id ?? null;
  const [adminTab, setAdminTab] = useState<AdminTab>('matrix');

  if (!clubId) return null;

  const isAdminOrOwner = role === 'ADMIN' || role === 'OWNER';

  if (!isAdminOrOwner) {
    // Regular member: only sees own payments
    return (
      <div className="mx-auto max-w-2xl px-4 py-6">
        <h1 className="mb-6 text-xl font-semibold">Mes paiements</h1>
        <MyPayments clubId={clubId} />
      </div>
    );
  }

  // Admin/Owner: tabbed view with matrix and full history
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="mb-6 text-xl font-semibold">Gestion des licences</h1>

      {/* Tab bar */}
      <div className="mb-6 flex gap-1 border-b">
        <button
          onClick={() => setAdminTab('matrix')}
          className={[
            'px-4 py-2 text-sm font-medium',
            adminTab === 'matrix'
              ? 'border-b-2 border-primary text-primary'
              : 'text-gray-500 hover:text-gray-700',
          ].join(' ')}
        >
          Statut des licences
        </button>
        <button
          onClick={() => setAdminTab('history')}
          className={[
            'px-4 py-2 text-sm font-medium',
            adminTab === 'history'
              ? 'border-b-2 border-primary text-primary'
              : 'text-gray-500 hover:text-gray-700',
          ].join(' ')}
        >
          Historique des paiements
        </button>
      </div>

      {adminTab === 'matrix' ? (
        <LicenseStatusMatrix clubId={clubId} />
      ) : (
        <PaymentHistory clubId={clubId} />
      )}
    </div>
  );
}
