import { useState, useCallback, useRef, useEffect } from 'react';
import { ChevronDown, Check, Plus } from 'lucide-react';
import { cn } from './cn';

export interface ClubSwitcherClub {
  clubId: string;
  name: string;
  logo: string | null;
  federationType: string | null;
  role: string;
}

interface ClubSwitcherProps {
  clubs: ClubSwitcherClub[];
  activeClubId: string | null;
  onSwitch: (clubId: string) => void;
  onJoinClub?: () => void;
  variant?: 'header' | 'sidebar';
}

function ClubInitials({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
      {initials}
    </div>
  );
}

function ClubLogo({ club }: { club: ClubSwitcherClub }) {
  if (club.logo) {
    return (
      <img
        src={club.logo}
        alt={`${club.name} logo`}
        className="h-8 w-8 shrink-0 rounded-full object-cover"
      />
    );
  }
  return <ClubInitials name={club.name} />;
}

export function ClubSwitcher({
  clubs,
  activeClubId,
  onSwitch,
  onJoinClub,
  variant = 'header',
}: ClubSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const activeClub = clubs.find((c) => c.clubId === activeClubId);
  const triggerLabel = activeClub?.name ?? 'Select club';

  const close = useCallback(() => {
    setOpen(false);
    setFocusedIndex(-1);
  }, []);

  const handleSelect = useCallback(
    (clubId: string) => {
      if (clubId !== activeClubId) {
        onSwitch(clubId);
      }
      close();
    },
    [activeClubId, onSwitch, close],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!open) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
          e.preventDefault();
          setOpen(true);
          setFocusedIndex(0);
        }
        return;
      }

      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          close();
          break;
        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex((prev) => Math.min(prev + 1, clubs.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < clubs.length) {
            handleSelect(clubs[focusedIndex].clubId);
          }
          break;
      }
    },
    [open, close, clubs, focusedIndex, handleSelect],
  );

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, close]);

  // Scroll focused item into view
  useEffect(() => {
    if (focusedIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('[role="option"]');
      items[focusedIndex]?.scrollIntoView?.({ block: 'nearest' });
    }
  }, [focusedIndex]);

  return (
    <div ref={containerRef} className="relative" onKeyDown={handleKeyDown}>
      {/* Trigger */}
      <button
        type="button"
        className={cn(
          'flex items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted/50',
          variant === 'sidebar' ? 'w-full' : '',
        )}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`Club actif : ${triggerLabel}`}
        onClick={() => {
          setOpen(!open);
          if (!open) setFocusedIndex(clubs.findIndex((c) => c.clubId === activeClubId));
        }}
      >
        {activeClub && <ClubLogo club={activeClub} />}
        <span className="truncate text-sm font-medium">{triggerLabel}</span>
        <ChevronDown
          className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className={cn(
            'absolute z-50 mt-1 w-64 rounded-lg border border-border bg-card shadow-lg',
            variant === 'sidebar' ? 'left-0 top-full' : 'left-0 top-full',
          )}
        >
          <ul ref={listRef} role="listbox" aria-label="Clubs" className="max-h-64 overflow-auto p-1">
            {clubs.map((club, index) => {
              const isActive = club.clubId === activeClubId;
              const isFocused = index === focusedIndex;

              return (
                <li
                  key={club.clubId}
                  role="option"
                  aria-selected={isActive}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                    isFocused && 'bg-muted',
                    !isFocused && 'hover:bg-muted/50',
                  )}
                  onClick={() => handleSelect(club.clubId)}
                  onMouseEnter={() => setFocusedIndex(index)}
                >
                  <ClubLogo club={club} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{club.name}</div>
                    {club.federationType && (
                      <div className="truncate text-xs text-muted-foreground">{club.federationType}</div>
                    )}
                  </div>
                  {isActive && <Check className="h-4 w-4 shrink-0 text-primary" />}
                </li>
              );
            })}
          </ul>

          {onJoinClub && (
            <div className="border-t border-border p-1">
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                onClick={() => {
                  close();
                  onJoinClub();
                }}
              >
                <Plus className="h-4 w-4" />
                <span>Rejoindre un autre club</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
