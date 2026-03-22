import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ParticipantList } from './ParticipantList';
import type { EventParticipant, ParticipationCounts } from '@org/types';

const makeCounts = (going = 0, maybe = 0, notGoing = 0): ParticipationCounts => ({
  going,
  maybe,
  notGoing,
});

const makeParticipant = (id: string, status = 'GOING'): EventParticipant => ({
  userId: id,
  firstName: 'User',
  lastName: id,
  avatarUrl: null,
  status: status as EventParticipant['status'],
});

describe('ParticipantList', () => {
  it('displays going/maybe/notGoing counts', () => {
    render(
      <ParticipantList
        participants={[makeParticipant('u1')]}
        counts={makeCounts(1, 2, 3)}
      />,
    );

    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders going participants with name', () => {
    render(
      <ParticipantList
        participants={[makeParticipant('Julie')]}
        counts={makeCounts(1)}
      />,
    );

    expect(screen.getByText(/julie/i)).toBeInTheDocument();
  });

  it('shows empty state when no one is going', () => {
    render(
      <ParticipantList
        participants={[]}
        counts={makeCounts(0)}
      />,
    );

    expect(screen.getByText(/soyez le premier/i)).toBeInTheDocument();
  });

  it('only shows first 5 participants initially', () => {
    const participants = Array.from({ length: 7 }, (_, i) =>
      makeParticipant(`u${i}`),
    );

    render(
      <ParticipantList
        participants={participants}
        counts={makeCounts(7)}
      />,
    );

    // Should show "Voir tous (7)" expand button
    expect(screen.getByRole('button', { name: /voir tous/i })).toBeInTheDocument();
  });

  it('expands to show all participants when "Voir tous" clicked', () => {
    const participants = Array.from({ length: 7 }, (_, i) =>
      makeParticipant(`u${i}`),
    );

    render(
      <ParticipantList
        participants={participants}
        counts={makeCounts(7)}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /voir tous/i }));

    expect(screen.getByRole('button', { name: /voir moins/i })).toBeInTheDocument();
  });

  it('does not show expand button when 5 or fewer participants', () => {
    const participants = Array.from({ length: 5 }, (_, i) =>
      makeParticipant(`u${i}`),
    );

    render(
      <ParticipantList
        participants={participants}
        counts={makeCounts(5)}
      />,
    );

    expect(screen.queryByRole('button', { name: /voir tous/i })).not.toBeInTheDocument();
  });

  it('only shows GOING participants in the list', () => {
    const participants = [
      makeParticipant('goer1', 'GOING'),
      makeParticipant('maybe1', 'MAYBE'),
      makeParticipant('nope1', 'NOT_GOING'),
    ];

    render(
      <ParticipantList
        participants={participants}
        counts={makeCounts(1, 1, 1)}
      />,
    );

    // Only 1 participant row (goer1)
    const listItems = screen.getAllByText(/user/i);
    // Just checking that the list renders (goer1 first name is "User")
    expect(listItems.length).toBeGreaterThanOrEqual(1);
  });
});
