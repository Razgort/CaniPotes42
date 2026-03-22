import { Avatar } from '@org/ui';
import { cn } from '@org/ui';

interface ChatBubbleProps {
  content: string;
  senderName: string;
  senderAvatar: string | null | undefined;
  createdAt: string;
  isOwn: boolean;
}

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function ChatBubble({
  content,
  senderName,
  senderAvatar,
  createdAt,
  isOwn,
}: ChatBubbleProps) {
  const initials = senderName
    .split(' ')
    .map((n) => n[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className={cn(
        'flex gap-2 max-w-[85%]',
        isOwn ? 'ml-auto flex-row-reverse' : 'mr-auto flex-row',
      )}
    >
      {!isOwn && (
        <div className="flex-shrink-0 mt-1">
          <Avatar
            src={senderAvatar ?? undefined}
            fallback={initials}
            size="sm"
          />
        </div>
      )}

      <div
        className={cn(
          'flex flex-col gap-0.5',
          isOwn ? 'items-end' : 'items-start',
        )}
      >
        {!isOwn && (
          <span className="text-xs text-muted-foreground px-1">{senderName}</span>
        )}
        <div
          className={cn(
            'rounded-2xl px-3 py-2 text-sm leading-relaxed break-words',
            isOwn
              ? 'bg-blue-100 text-blue-900 rounded-tr-sm'
              : 'bg-muted text-foreground rounded-tl-sm',
          )}
        >
          {content}
        </div>
        <span className="text-[10px] text-muted-foreground px-1">
          {formatTime(createdAt)}
        </span>
      </div>
    </div>
  );
}
