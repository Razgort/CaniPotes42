import { NavLink } from 'react-router-dom';
import { Calendar, MessageCircle, PawPrint, User, Users, Settings } from 'lucide-react';
import { cn } from './cn';
import { ClubSwitcher } from './ClubSwitcher';
import type { ClubSwitcherClub } from './ClubSwitcher';
import { BottomTabBar } from './BottomTabBar';

interface AppShellProps {
  children: React.ReactNode;
  clubs?: ClubSwitcherClub[];
  activeClubId?: string | null;
  role?: string | null;
  onSwitchClub?: (clubId: string) => void;
  onJoinClub?: () => void;
  unreadChatCount?: number;
}

const sidebarNavItems = [
  { label: 'Events', icon: Calendar, path: '/events' },
  { label: 'Chat', icon: MessageCircle, path: '/chat' },
  { label: 'Chiens', icon: PawPrint, path: '/dogs' },
  { label: 'Profil', icon: User, path: '/profile' },
];

const adminNavItems = [
  { label: 'Membres', icon: Users, path: '/members', roles: ['ADMIN', 'OWNER'] },
  { label: 'Paramètres', icon: Settings, path: '/clubs/settings', roles: ['OWNER'] },
];

export function AppShell({
  children,
  clubs = [],
  activeClubId = null,
  role = null,
  onSwitchClub,
  onJoinClub,
  unreadChatCount = 0,
}: AppShellProps) {
  const activeClub = clubs.find((c) => c.clubId === activeClubId);
  const clubName = activeClub?.name ?? 'CaniFed';
  const isAdmin = role === 'ADMIN' || role === 'OWNER';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 flex items-center h-14 px-4 bg-card border-b border-border lg:pl-[240px]">
        {/* Mobile: ClubSwitcher in header */}
        <div className="lg:hidden">
          {onSwitchClub ? (
            <ClubSwitcher
              clubs={clubs}
              activeClubId={activeClubId}
              onSwitch={onSwitchClub}
              onJoinClub={onJoinClub}
              variant="header"
            />
          ) : (
            <h1 className="text-sm font-medium text-foreground">{clubName}</h1>
          )}
        </div>
        {/* Desktop: just show club name (switcher is in sidebar) */}
        <div className="hidden lg:block">
          <h1 className="text-sm font-medium text-foreground">{clubName}</h1>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside
        className="fixed top-0 left-0 bottom-0 hidden lg:flex flex-col w-[240px] bg-card border-r border-border"
        aria-label="Navigation latérale"
      >
        {/* Club Switcher at top of sidebar */}
        <div className="border-b border-border p-3">
          {onSwitchClub ? (
            <ClubSwitcher
              clubs={clubs}
              activeClubId={activeClubId}
              onSwitch={onSwitchClub}
              onJoinClub={onJoinClub}
              variant="sidebar"
            />
          ) : (
            <span className="text-sm font-medium">{clubName}</span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {sidebarNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-primary/10 font-medium text-primary'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                )
              }
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
              {item.path === '/chat' && unreadChatCount > 0 && (
                <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-[#FF6B6B] px-1.5 text-[10px] font-bold text-white">
                  {unreadChatCount > 99 ? '99+' : unreadChatCount}
                </span>
              )}
            </NavLink>
          ))}

          {isAdmin && (
            <>
              <div className="my-2 border-t border-border" />
              <span className="px-3 text-xs font-medium uppercase text-muted-foreground">
                Administration
              </span>
              {adminNavItems
                .filter((item) => item.roles.includes(role as string))
                .map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                      isActive
                        ? 'bg-primary/10 font-medium text-primary'
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                    )
                  }
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </>
          )}
        </nav>
      </aside>

      {/* Main Content */}
      <main
        className={cn(
          'pt-14 pb-14 lg:pb-0',
          'px-4 sm:px-6 lg:px-8',
          'lg:pl-[calc(240px+32px)]',
          'mx-auto',
          'sm:max-w-[768px] lg:max-w-[1200px]',
        )}
      >
        {children}
      </main>

      {/* Mobile Bottom Tab Bar */}
      <BottomTabBar unreadChatCount={unreadChatCount} />
    </div>
  );
}
