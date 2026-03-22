import { cn } from './cn';

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-16 w-16 text-lg',
};

function getInitials(firstName: string, lastName: string): string {
  return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();
}

interface AvatarProps {
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Avatar({
  firstName,
  lastName,
  avatarUrl,
  size = 'md',
  className,
}: AvatarProps) {
  const initials = getInitials(firstName, lastName);

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={`${firstName} ${lastName}`}
        className={cn(
          'rounded-full object-cover',
          sizeClasses[size],
          className,
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full bg-primary/10 font-medium text-primary',
        sizeClasses[size],
        className,
      )}
      aria-label={`${firstName} ${lastName}`}
    >
      {initials}
    </div>
  );
}
