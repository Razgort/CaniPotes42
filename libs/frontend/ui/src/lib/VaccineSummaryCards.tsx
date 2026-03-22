import { cn } from './cn';
import type { VaccineStatusValue } from './VaccineStatusBadge';

export interface VaccineSummary {
  ok: number;
  warning: number;
  critical: number;
}

interface VaccineSummaryCardsProps {
  summary: VaccineSummary;
  activeFilter: VaccineStatusValue | null;
  onFilterChange: (status: VaccineStatusValue | null) => void;
  className?: string;
}

interface CardConfig {
  id: string;
  status: VaccineStatusValue;
  label: string;
  count: number;
  icon: string;
  textClass: string;
  bgClass: string;
  bgActiveClass: string;
  borderClass: string;
  borderActiveClass: string;
}

export function VaccineSummaryCards({
  summary,
  activeFilter,
  onFilterChange,
  className,
}: VaccineSummaryCardsProps) {
  const cards: CardConfig[] = [
    {
      id: 'vax-dash-summary-ok',
      status: 'UP_TO_DATE',
      label: 'À jour',
      count: summary.ok,
      icon: '✓',
      textClass: 'text-green-700',
      bgClass: 'bg-green-50',
      bgActiveClass: 'bg-green-100',
      borderClass: 'border-green-200',
      borderActiveClass: 'border-green-500',
    },
    {
      id: 'vax-dash-summary-warn',
      status: 'EXPIRING_SOON',
      label: 'À renouveler',
      count: summary.warning,
      icon: '⚠',
      textClass: 'text-amber-700',
      bgClass: 'bg-amber-50',
      bgActiveClass: 'bg-amber-100',
      borderClass: 'border-amber-200',
      borderActiveClass: 'border-amber-500',
    },
    {
      id: 'vax-dash-summary-bad',
      status: 'EXPIRED',
      label: 'Manquant / expiré',
      count: summary.critical,
      icon: '✕',
      textClass: 'text-red-700',
      bgClass: 'bg-red-50',
      bgActiveClass: 'bg-red-100',
      borderClass: 'border-red-200',
      borderActiveClass: 'border-red-500',
    },
  ];

  return (
    <section
      role="region"
      aria-label="Synthèse vaccinale"
      className={cn('grid grid-cols-3 gap-2 p-4', className)}
    >
      {cards.map((card) => {
        const isActive = activeFilter === card.status;
        return (
          <button
            key={card.id}
            type="button"
            data-testid={card.id}
            onClick={() => onFilterChange(isActive ? null : card.status)}
            aria-label={`${card.count} chien${card.count !== 1 ? 's' : ''} ${card.label}, appuyez pour filtrer`}
            aria-pressed={isActive}
            className={cn(
              'flex flex-col items-center gap-1 rounded-lg border p-3 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20',
              isActive ? card.bgActiveClass : card.bgClass,
              isActive ? card.borderActiveClass : card.borderClass,
              'hover:opacity-90',
            )}
          >
            <span className={cn('text-2xl font-bold', card.textClass)}>{card.count}</span>
            <span className={cn('text-xs font-medium text-center leading-tight', card.textClass)}>
              <span aria-hidden="true" className="mr-1">
                {card.icon}
              </span>
              {card.label}
            </span>
          </button>
        );
      })}
    </section>
  );
}
