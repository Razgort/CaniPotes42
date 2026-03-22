import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { BottomTabBar } from './BottomTabBar';
import { describe, it, expect } from 'vitest';

function renderWithRouter(ui: React.ReactElement, initialPath = '/events') {
  return render(<MemoryRouter initialEntries={[initialPath]}>{ui}</MemoryRouter>);
}

describe('BottomTabBar', () => {
  it('renders 4 tabs', () => {
    renderWithRouter(<BottomTabBar />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(4);
  });

  it('renders correct tab labels', () => {
    renderWithRouter(<BottomTabBar />);
    expect(screen.getByText('Events')).toBeInTheDocument();
    expect(screen.getByText('Chat')).toBeInTheDocument();
    expect(screen.getByText('Chiens')).toBeInTheDocument();
    expect(screen.getByText('Profil')).toBeInTheDocument();
  });

  it('has role="tablist" on container', () => {
    renderWithRouter(<BottomTabBar />);
    expect(screen.getByRole('tablist')).toBeInTheDocument();
  });

  it('marks active tab with aria-selected', () => {
    renderWithRouter(<BottomTabBar />, '/events');
    const tabs = screen.getAllByRole('tab');
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[1]).toHaveAttribute('aria-selected', 'false');
  });

  it('shows unread badge on chat tab when count > 0', () => {
    renderWithRouter(<BottomTabBar unreadChatCount={5} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('does not show badge when unread count is 0', () => {
    renderWithRouter(<BottomTabBar unreadChatCount={0} />);
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('caps badge display at 99+', () => {
    renderWithRouter(<BottomTabBar unreadChatCount={150} />);
    expect(screen.getByText('99+')).toBeInTheDocument();
  });

  it('announces unread count in aria-label', () => {
    renderWithRouter(<BottomTabBar unreadChatCount={3} />);
    const chatTab = screen.getByLabelText('Chat, 3 messages non lus');
    expect(chatTab).toBeInTheDocument();
  });

  it('has lg:hidden class for desktop hiding', () => {
    renderWithRouter(<BottomTabBar />);
    const nav = screen.getByRole('tablist');
    expect(nav.className).toContain('lg:hidden');
  });
});
