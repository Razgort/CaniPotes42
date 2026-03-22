import { render, screen, fireEvent } from '@testing-library/react';
import { ClubSwitcher } from './ClubSwitcher';
import type { ClubSwitcherClub } from './ClubSwitcher';
import { describe, it, expect, vi } from 'vitest';

const mockClubs: ClubSwitcherClub[] = [
  { clubId: 'club-1', name: 'Alpha Club', logo: null, federationType: 'FFSLC', role: 'OWNER' },
  { clubId: 'club-2', name: 'Beta Club', logo: 'https://example.com/logo.png', federationType: 'CNEAC', role: 'MEMBER' },
];

describe('ClubSwitcher', () => {
  it('renders trigger with active club name', () => {
    render(
      <ClubSwitcher clubs={mockClubs} activeClubId="club-1" onSwitch={() => {}} />,
    );
    expect(screen.getByText('Alpha Club')).toBeInTheDocument();
  });

  it('opens dropdown and shows all clubs on click', () => {
    render(
      <ClubSwitcher clubs={mockClubs} activeClubId="club-1" onSwitch={() => {}} />,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(2);
  });

  it('marks active club with aria-selected', () => {
    render(
      <ClubSwitcher clubs={mockClubs} activeClubId="club-1" onSwitch={() => {}} />,
    );
    fireEvent.click(screen.getByRole('button'));
    const options = screen.getAllByRole('option');
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
    expect(options[1]).toHaveAttribute('aria-selected', 'false');
  });

  it('calls onSwitch with correct clubId on selection', () => {
    const onSwitch = vi.fn();
    render(
      <ClubSwitcher clubs={mockClubs} activeClubId="club-1" onSwitch={onSwitch} />,
    );
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getAllByRole('option')[1]);
    expect(onSwitch).toHaveBeenCalledWith('club-2');
  });

  it('does not call onSwitch when selecting already active club', () => {
    const onSwitch = vi.fn();
    render(
      <ClubSwitcher clubs={mockClubs} activeClubId="club-1" onSwitch={onSwitch} />,
    );
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getAllByRole('option')[0]);
    expect(onSwitch).not.toHaveBeenCalled();
  });

  it('shows join option when onJoinClub is provided', () => {
    render(
      <ClubSwitcher
        clubs={mockClubs}
        activeClubId="club-1"
        onSwitch={() => {}}
        onJoinClub={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('Rejoindre un autre club')).toBeInTheDocument();
  });

  it('does not show join option when onJoinClub is not provided', () => {
    render(
      <ClubSwitcher clubs={mockClubs} activeClubId="club-1" onSwitch={() => {}} />,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(screen.queryByText('Rejoindre un autre club')).not.toBeInTheDocument();
  });

  it('shows federation type for each club', () => {
    render(
      <ClubSwitcher clubs={mockClubs} activeClubId="club-1" onSwitch={() => {}} />,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('FFSLC')).toBeInTheDocument();
    expect(screen.getByText('CNEAC')).toBeInTheDocument();
  });

  it('works with single club — still shows switcher with join option', () => {
    const singleClub = [mockClubs[0]];
    render(
      <ClubSwitcher
        clubs={singleClub}
        activeClubId="club-1"
        onSwitch={() => {}}
        onJoinClub={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getAllByRole('option')).toHaveLength(1);
    expect(screen.getByText('Rejoindre un autre club')).toBeInTheDocument();
  });

  it('closes dropdown on Escape key', () => {
    render(
      <ClubSwitcher clubs={mockClubs} activeClubId="club-1" onSwitch={() => {}} />,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('button').parentElement!, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('has correct aria attributes on trigger', () => {
    render(
      <ClubSwitcher clubs={mockClubs} activeClubId="club-1" onSwitch={() => {}} />,
    );
    const trigger = screen.getByRole('button');
    expect(trigger).toHaveAttribute('aria-haspopup', 'listbox');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });
});
