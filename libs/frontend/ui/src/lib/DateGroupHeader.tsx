interface DateGroupHeaderProps {
  label: string;
}

export function DateGroupHeader({ label }: DateGroupHeaderProps) {
  return (
    <div
      role="heading"
      aria-level={3}
      className="sticky top-0 z-10 border-b bg-background/95 px-1 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur supports-[backdrop-filter]:bg-background/60"
    >
      {label}
    </div>
  );
}
