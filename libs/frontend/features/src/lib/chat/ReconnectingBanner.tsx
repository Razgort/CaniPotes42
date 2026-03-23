interface ReconnectingBannerProps {
  isReconnecting: boolean;
}

export function ReconnectingBanner({ isReconnecting }: ReconnectingBannerProps) {
  if (!isReconnecting) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-center gap-2 border-b border-border bg-muted/60 px-4 py-1.5 text-xs text-muted-foreground"
    >
      <span
        className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"
        aria-hidden="true"
      />
      <span>Reconnexion en cours...</span>
    </div>
  );
}
