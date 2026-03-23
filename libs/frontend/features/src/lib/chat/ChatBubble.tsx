import { useState } from 'react';
import { Clock } from 'lucide-react';
import { Avatar } from '@org/ui';
import { cn } from '@org/ui';
import type { LocalChatMessage } from './hooks/useChatImage';

interface ChatBubbleProps {
  message: LocalChatMessage;
  isOwn: boolean;
  isPending?: boolean;
  onRetry?: (localId: string) => void;
}

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function FullScreenViewer({
  imageUrl,
  senderName,
  onClose,
}: {
  imageUrl: string;
  senderName: string;
  onClose: () => void;
}) {
  return (
    <dialog
      open
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 m-0 w-screen h-screen max-w-none max-h-none border-0"
      onClick={onClose}
      aria-label="Visionneuse d'image"
    >
      <button
        type="button"
        className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
        onClick={onClose}
        aria-label="Fermer l'image"
      >
        ✕
      </button>
      <img
        src={imageUrl}
        alt={`Image partagée par ${senderName}`}
        className="max-w-full max-h-full rounded-lg object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </dialog>
  );
}

function ChatImage({
  imageUrl,
  senderName,
  status,
  localId,
  onRetry,
}: {
  imageUrl: string;
  senderName: string;
  status?: 'uploading' | 'failed';
  localId?: string;
  onRetry?: (id: string) => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);

  if (status === 'uploading') {
    return (
      <div className="flex h-[160px] w-[240px] animate-pulse items-center justify-center rounded-lg bg-muted">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground/40 border-t-muted-foreground" />
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <button
        type="button"
        onClick={() => localId && onRetry?.(localId)}
        className="flex h-[120px] w-[240px] flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-destructive/40 bg-destructive/5 text-xs text-destructive hover:bg-destructive/10 transition-colors"
      >
        <span>⚠️</span>
        <span>Échec de l&apos;envoi — appuyez pour réessayer</span>
      </button>
    );
  }

  return (
    <>
      <img
        src={imageUrl}
        alt={`Image partagée par ${senderName}`}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onClick={() => setFullScreen(true)}
        className={cn(
          'max-w-[240px] rounded-lg cursor-pointer transition-all duration-300',
          !loaded && 'blur-sm opacity-70',
          loaded && 'blur-0 opacity-100',
        )}
      />
      {fullScreen && (
        <FullScreenViewer
          imageUrl={imageUrl}
          senderName={senderName}
          onClose={() => setFullScreen(false)}
        />
      )}
    </>
  );
}

export function ChatBubble({ message, isOwn, isPending = false, onRetry }: ChatBubbleProps) {
  const { content, senderName, senderAvatar, createdAt, imageUrl, status, id } = message;

  const initials = senderName
    .split(' ')
    .map((n) => n[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const displayImageUrl = message.localObjectUrl ?? imageUrl;

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
            displayImageUrl && 'p-1.5',
            isPending && 'opacity-60',
          )}
          data-testid={isPending ? 'pending-bubble' : undefined}
        >
          {displayImageUrl ? (
            <ChatImage
              imageUrl={displayImageUrl}
              senderName={senderName}
              status={status}
              localId={id}
              onRetry={onRetry}
            />
          ) : (
            content
          )}
        </div>
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground px-1">
          {formatTime(createdAt)}
          {isPending && (
            <Clock
              className="h-3.5 w-3.5"
              aria-label="Message en attente d'envoi"
              data-testid="pending-clock"
            />
          )}
        </span>
      </div>
    </div>
  );
}
