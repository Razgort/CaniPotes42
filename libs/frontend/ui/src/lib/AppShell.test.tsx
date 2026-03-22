import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppShell } from './AppShell';

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

const mockClubs = [
  { clubId: 'club-1', name: 'Alpha Club', logo: null, federationType: 'FFSLC', role: 'OWNER' },
  { clubId: 'club-2', name: 'Beta Club', logo: 'logo.png', federationType: 'CNEAC', role: 'MEMBER' },
];

describe('AppShell', () => {
  it('renders children in main content area', () => {
    renderWithRouter(<AppShell><p>Test content</p></AppShell>);
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('renders header element', () => {
    renderWithRouter(<AppShell>content</AppShell>);
    expect(document.querySelector('header')).toBeInTheDocument();
  });

  it('renders main element', () => {
    renderWithRouter(<AppShell>content</AppShell>);
    expect(document.querySelector('main')).toBeInTheDocument();
  });

  it('renders bottom tab bar with navigation label', () => {
    renderWithRouter(<AppShell>content</AppShell>);
    expect(screen.getByLabelText('Navigation principale')).toBeInTheDocument();
  });

  it('renders sidebar with navigation label', () => {
    renderWithRouter(<AppShell>content</AppShell>);
    expect(screen.getByLabelText('Navigation latérale')).toBeInTheDocument();
  });

  it('shows default club name when no clubs provided', () => {
    renderWithRouter(<AppShell>content</AppShell>);
    expect(screen.getAllByText('CaniFed').length).toBeGreaterThan(0);
  });

  it('shows active club name when clubs and activeClubId provided', () => {
    renderWithRouter(
      <AppShell
        clubs={mockClubs}
        activeClubId="club-1"
        onSwitchClub={() => {}}
      >
        content
      </AppShell>,
    );
    expect(screen.getAllByText('Alpha Club').length).toBeGreaterThan(0);
  });

  it('renders admin nav items when role is ADMIN or OWNER', () => {
    renderWithRouter(
      <AppShell clubs={mockClubs} activeClubId="club-1" role="OWNER" onSwitchClub={() => {}}>
        content
      </AppShell>,
    );
    expect(screen.getByText('Administration')).toBeInTheDocument();
  });

  it('does not render admin nav items when role is MEMBER', () => {
    renderWithRouter(
      <AppShell clubs={mockClubs} activeClubId="club-2" role="MEMBER" onSwitchClub={() => {}}>
        content
      </AppShell>,
    );
    expect(screen.queryByText('Administration')).not.toBeInTheDocument();
  });
});
