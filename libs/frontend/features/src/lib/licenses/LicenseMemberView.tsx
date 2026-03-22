import { useLicenseTypes, useInitiateStripePayment } from './hooks/useLicenseTypes';

interface LicenseMemberViewProps {
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

export function LicenseMemberView({ clubId }: LicenseMemberViewProps) {
  const { data, isLoading } = useLicenseTypes(clubId);
  const initiateStripe = useInitiateStripePayment();
  const licenseTypes = data?.data ?? [];

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (licenseTypes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-12 text-center">
        <p className="text-sm text-muted-foreground">
          Aucun type de licence disponible.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Licences disponibles</h1>
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
            {lt.paymentProvider === 'STRIPE' ? (
              <button
                type="button"
                onClick={() => initiateStripe.mutate({ licenseTypeId: lt.id })}
                disabled={initiateStripe.isPending}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {initiateStripe.isPending ? '...' : 'Payer'}
              </button>
            ) : (
              <button
                type="button"
                disabled
                title="Paiement HelloAsso disponible prochainement"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground opacity-50 cursor-not-allowed"
              >
                Payer
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
