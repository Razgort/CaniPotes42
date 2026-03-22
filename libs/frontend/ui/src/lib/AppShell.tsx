import { cn } from './cn';

interface AppShellProps {
  children: React.ReactNode;
  clubName?: string;
}

export function AppShell({ children, clubName = 'CaniFed' }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header
        className="fixed top-0 left-0 right-0 z-40 flex items-center h-14 px-4 bg-card border-b border-border lg:pl-[240px]"
      >
        <h1 className="text-h3 text-foreground">{clubName}</h1>
      </header>

      {/* Desktop Sidebar */}
      <aside
        className="fixed top-14 left-0 bottom-0 hidden lg:flex flex-col w-[240px] bg-card border-r border-border p-4"
        aria-label="Navigation latérale"
      >
        <nav className="flex flex-col gap-2 text-muted text-small">
          <span>Navigation</span>
        </nav>
      </aside>

      {/* Main Content */}
      <main
        className={cn(
          'pt-14 pb-14 sm:pb-0',
          'px-4 sm:px-6 lg:px-8',
          'lg:pl-[calc(240px+32px)]',
          'mx-auto',
          'sm:max-w-[768px] lg:max-w-[1200px]'
        )}
      >
        {children}
      </main>

      {/* Mobile Bottom Tab Bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around h-14 bg-card border-t border-border sm:hidden"
        aria-label="Navigation principale"
      >
        <span role="tab" className="text-muted text-small" aria-selected="false">
          Accueil
        </span>
        <span role="tab" className="text-muted text-small" aria-selected="false">
          Chat
        </span>
        <span role="tab" className="text-muted text-small" aria-selected="false">
          Chiens
        </span>
        <span role="tab" className="text-muted text-small" aria-selected="false">
          Profil
        </span>
      </nav>
    </div>
  );
}
