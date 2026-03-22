import { cn } from './cn';
import type { VaccineStatusValue } from '@org/types';

export type { VaccineStatusValue };

const STATUS_CONFIG: Record<
  VaccineStatusValue,
  { label: string; icon: string; textClass: string; bgClass: string; borderClass: string }
> = {
  UP_TO_DATE: {
    label: 'À jour',
    icon: '✓',
    textClass: 'text-green-700',
    bgClass: 'bg-green-50',
    borderClass: 'border-green-200',
  },
  EXPIRING_SOON: {
    label: 'À renouveler',
    icon: '⚠',
    textClass: 'text-amber-700',
    bgClass: 'bg-amber-50',
    borderClass: 'border-amber-200',
  },
  EXPIRED: {
    label: 'Manquant / expiré',
    icon: '✕',
    textClass: 'text-red-700',
    bgClass: 'bg-red-50',
    borderClass: 'border-red-200',
  },
};

interface VaccineStatusBadgeProps {
  status: VaccineStatusValue;
  /** 'badge' = compact inline, 'card' = summary card with count */
  variant?: 'badge' | 'card';
  count?: number;
  className?: string;
}

export function VaccineStatusBadge({
  status,
  variant = 'badge',
  count,
  className,
}: VaccineStatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  if (variant === 'card') {
    return (
      <div
        data-testid={`vax-dash-status-icon-${status.toLowerCase()}`}
        className={cn(
          'flex flex-col items-center gap-1 rounded-lg border p-3',
          config.bgClass,
          config.borderClass,
          className,
        )}
        aria-label={`Statut vaccin : ${config.label}`}
      >
        <span className={cn('text-2xl font-bold', config.textClass)}>{count ?? 0}</span>
        <span className={cn('text-xs font-medium text-center leading-tight', config.textClass)}>
          <span className="mr-1" aria-hidden="true">
            {config.icon}
          </span>
          {config.label}
        </span>
      </div>
    );
  }

  return (
    <span
      data-testid="vax-dash-status-icon"
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
        config.bgClass,
        config.borderClass,
        config.textClass,
        className,
      )}
      aria-label={`Statut vaccin : ${config.label}`}
    >
      <span aria-hidden="true">{config.icon}</span>
      {config.label}
    </span>
  );
}
