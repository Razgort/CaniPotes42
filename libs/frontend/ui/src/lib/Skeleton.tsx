import { cn } from './cn';

interface SkeletonCardProps {
  height?: number;
  className?: string;
}

export function SkeletonCard({ height = 120, className }: SkeletonCardProps) {
  return (
    <div
      className={cn(
        'w-full rounded-lg bg-border/50 animate-pulse motion-reduce:animate-none',
        className
      )}
      style={{ height }}
      aria-hidden="true"
    />
  );
}

interface SkeletonListProps {
  count?: number;
  className?: string;
}

export function SkeletonList({ count = 3, className }: SkeletonListProps) {
  const widths = ['w-3/5', 'w-4/5', 'w-2/5', 'w-3/4', 'w-1/2'];

  return (
    <div className={cn('flex flex-col gap-3', className)} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className={cn(
            'h-3 rounded bg-border/50 animate-pulse motion-reduce:animate-none',
            widths[i % widths.length]
          )}
        />
      ))}
    </div>
  );
}
