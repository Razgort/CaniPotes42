import { Avatar } from './Avatar';
import { RoleBadge } from './RoleBadge';
import { cn } from './cn';

interface MemberCardProps {
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  onClick?: () => void;
  className?: string;
}

export function MemberCard({
  firstName,
  lastName,
  avatarUrl,
  role,
  onClick,
  className,
}: MemberCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg border bg-card p-3 text-left transition-colors hover:bg-accent/50',
        className,
      )}
    >
      <Avatar
        firstName={firstName}
        lastName={lastName}
        avatarUrl={avatarUrl}
        size="md"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">
          {firstName} {lastName}
        </p>
      </div>
      <RoleBadge role={role} />
    </button>
  );
}
