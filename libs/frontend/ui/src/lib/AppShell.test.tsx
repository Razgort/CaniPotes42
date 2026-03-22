import { render, screen } from '@testing-library/react';
import { AppShell } from './AppShell';

describe('AppShell', () => {
  it('renders header with default club name', () => {
    render(<AppShell>content</AppShell>);
    expect(screen.getByText('CaniFed')).toBeInTheDocument();
  });

  it('renders header with custom club name', () => {
    render(<AppShell clubName="Mon Club">content</AppShell>);
    expect(screen.getByText('Mon Club')).toBeInTheDocument();
  });

  it('renders children in main content area', () => {
    render(<AppShell><p>Test content</p></AppShell>);
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('renders header element', () => {
    render(<AppShell>content</AppShell>);
    expect(document.querySelector('header')).toBeInTheDocument();
  });

  it('renders main element', () => {
    render(<AppShell>content</AppShell>);
    expect(document.querySelector('main')).toBeInTheDocument();
  });

  it('renders bottom nav with tablist role', () => {
    render(<AppShell>content</AppShell>);
    expect(screen.getByRole('tablist')).toBeInTheDocument();
  });

  it('renders sidebar with navigation label', () => {
    render(<AppShell>content</AppShell>);
    expect(screen.getByLabelText('Navigation latérale')).toBeInTheDocument();
  });
});
