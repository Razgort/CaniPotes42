import { useCallback } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Calendar, MessageCircle, PawPrint, User } from 'lucide-react';
import { cn } from './cn';

interface TabItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  badge?: number;
}

const tabs: TabItem[] = [
  { label: 'Events', icon: Calendar, path: '/events' },
  { label: 'Chat', icon: MessageCircle, path: '/chat' },
  { label: 'Chiens', icon: PawPrint, path: '/dogs' },
  { label: 'Profil', icon: User, path: '/profile' },
];

interface BottomTabBarProps {
  unreadChatCount?: number;
}

export function BottomTabBar({ unreadChatCount = 0 }: BottomTabBarProps) {
  const location = useLocation();

  const handleClick = useCallback(
    (path: string, e: React.MouseEvent) => {
      if (location.pathname === path) {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    [location.pathname],
  );

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex h-14 items-center justify-around border-t border-border bg-card lg:hidden"
      role="tablist"
      aria-label="Navigation principale"
    >
      {tabs.map((tab) => {
        const badge = tab.path === '/chat' ? unreadChatCount : undefined;
        const ariaLabel = badge
          ? `${tab.label}, ${badge} message${badge > 1 ? 's' : ''} non lu${badge > 1 ? 's' : ''}`
          : tab.label;

        return (
          <NavLink
            key={tab.path}
            to={tab.path}
            role="tab"
            aria-label={ariaLabel}
            aria-selected={location.pathname.startsWith(tab.path)}
            className={({ isActive }) =>
              cn(
                'relative flex flex-col items-center justify-center gap-0.5 px-3 py-1 min-w-[64px] min-h-[44px]',
                isActive ? 'text-primary' : 'text-muted-foreground',
              )
            }
            onClick={(e) => handleClick(tab.path, e)}
          >
            <tab.icon className="h-5 w-5" />
            <span
              className={cn(
                'text-[10px] leading-tight',
                location.pathname.startsWith(tab.path) ? 'font-medium' : '',
              )}
            >
              {tab.label}
            </span>
            {badge != null && badge > 0 && (
              <span
                className="absolute -top-0.5 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#FF6B6B] px-1 text-[10px] font-bold text-white"
                aria-hidden="true"
              >
                {badge > 99 ? '99+' : badge}
              </span>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}
