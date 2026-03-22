import { cn } from './cn';

export type VaccineStatusValue = 'UP_TO_DATE' | 'EXPIRING_SOON' | 'EXPIRED';

const statusConfig: Record<
  VaccineStatusValue,
  { label: string; className: string; ariaLabel: string }
> = {
  UP_TO_DATE: {
    label: 'À jour',
    className: 'bg-green-100 text-green-800',
    ariaLabel: 'Statut vaccin : À jour',
  },
  EXPIRING_SOON: {
    label: 'À renouveler',
    className: 'bg-orange-100 text-orange-800',
    ariaLabel: 'Statut vaccin : À renouveler',
  },
  EXPIRED: {
    label: 'Manquant / expiré',
    className: 'bg-red-100 text-red-800',
    ariaLabel: 'Statut vaccin : Manquant / expiré',
  },
};

interface VaccineStatusBadgeProps {
  status: VaccineStatusValue;
  className?: string;
  variant?: 'badge' | 'card';
  count?: number;
}

export function VaccineStatusBadge({
  status,
  className,
  variant = 'badge',
  count = 0,
}: VaccineStatusBadgeProps) {
  const config = statusConfig[status];

  if (variant === 'card') {
    return (
      <div
        className={cn(
          'flex flex-col items-center rounded-lg p-3 text-center',
          config.className,
          className,
        )}
        aria-label={config.ariaLabel}
      >
        <span className="text-2xl font-bold">{count}</span>
        <span className="text-xs font-medium">{config.label}</span>
      </div>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        config.className,
        className,
      )}
      aria-label={config.ariaLabel}
    >
      {config.label}
    </span>
  );
}
