import { cn } from './cn';

export type RsvpStatus = 'GOING' | 'MAYBE' | 'NOT_GOING';

interface RSVPButtonProps {
  currentStatus: RsvpStatus | null;
  onSelect: (status: RsvpStatus) => void;
  disabled?: boolean;
  compact?: boolean;
  className?: string;
}

const options: { value: RsvpStatus; label: string; icon: string }[] = [
  { value: 'GOING', label: "J'y vais", icon: '✓' },
  { value: 'MAYBE', label: 'Peut-être', icon: '?' },
  { value: 'NOT_GOING', label: 'Je ne peux pas', icon: '✗' },
];

const compactLabels: Record<RsvpStatus, string> = {
  GOING: '✓',
  MAYBE: '?',
  NOT_GOING: '✗',
};

export function RSVPButton({
  currentStatus,
  onSelect,
  disabled = false,
  compact = false,
  className,
}: RSVPButtonProps) {
  if (compact) {
    const label = currentStatus ? compactLabels[currentStatus] : '–';
    const ariaLabel = currentStatus
      ? `Mon statut : ${options.find((o) => o.value === currentStatus)?.label}`
      : 'Pas encore de réponse';

    return (
      <button
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors',
          currentStatus === 'GOING' && 'bg-blue-600 text-white',
          currentStatus === 'MAYBE' && 'bg-amber-100 text-amber-700',
          currentStatus === 'NOT_GOING' && 'bg-gray-100 text-gray-500',
          !currentStatus && 'bg-gray-100 text-gray-400',
          disabled && 'cursor-not-allowed opacity-50',
          className,
        )}
        onClick={
          !disabled && currentStatus
            ? () => onSelect(currentStatus)
            : undefined
        }
      >
        {label}
      </button>
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label="Votre participation"
      aria-disabled={disabled}
      className={cn('flex gap-2', className)}
    >
      {options.map((option) => {
        const isSelected = currentStatus === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={disabled}
            onClick={() => !disabled && onSelect(option.value)}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
              isSelected && option.value === 'GOING'
                ? 'border-blue-600 bg-blue-600 text-white'
                : isSelected && option.value === 'MAYBE'
                  ? 'border-amber-400 bg-amber-50 text-amber-700'
                  : isSelected && option.value === 'NOT_GOING'
                    ? 'border-gray-400 bg-gray-100 text-gray-600'
                    : 'border-border bg-background text-muted-foreground hover:bg-accent/50',
              disabled && 'cursor-not-allowed opacity-50',
            )}
          >
            <span aria-hidden="true">{option.icon}</span>
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
