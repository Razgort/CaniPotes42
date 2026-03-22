import { cn } from './cn';

const roleStyles = {
  OWNER: 'bg-amber-100 text-amber-800',
  ADMIN: 'bg-blue-100 text-blue-800',
  MEMBER: 'bg-gray-100 text-gray-700',
};

const roleLabels = {
  OWNER: 'Propriétaire',
  ADMIN: 'Admin',
  MEMBER: 'Membre',
};

interface RoleBadgeProps {
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  className?: string;
}

export function RoleBadge({ role, className }: RoleBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        roleStyles[role],
        className,
      )}
    >
      {roleLabels[role]}
    </span>
  );
}
