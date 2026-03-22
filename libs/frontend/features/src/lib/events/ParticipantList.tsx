import { useState } from 'react';
import { Avatar } from '@org/ui';
import type { EventParticipant, ParticipationCounts } from '@org/types';

const MAX_VISIBLE = 5;

interface ParticipantListProps {
  participants: EventParticipant[];
  counts: ParticipationCounts;
}

export function ParticipantList({ participants, counts }: ParticipantListProps) {
  const [expanded, setExpanded] = useState(false);

  const goingParticipants = participants.filter((p) => p.status === 'GOING');
  const visibleGoing = expanded ? goingParticipants : goingParticipants.slice(0, MAX_VISIBLE);
  const hasMore = goingParticipants.length > MAX_VISIBLE;

  return (
    <section aria-label="Participation à l'événement">
      {/* Counts summary */}
      <div className="flex gap-4 text-sm">
        <span className="font-medium text-foreground">
          {counts.going} <span className="text-muted-foreground">J'y vais</span>
        </span>
        <span className="font-medium text-foreground">
          {counts.maybe} <span className="text-muted-foreground">Peut-être</span>
        </span>
        <span className="font-medium text-foreground">
          {counts.notGoing} <span className="text-muted-foreground">Ne peut pas</span>
        </span>
      </div>

      {/* Participant list */}
      {goingParticipants.length > 0 ? (
        <div className="mt-3 space-y-2">
          {visibleGoing.map((participant) => (
            <div
              key={participant.userId}
              className="flex items-center gap-3"
            >
              <Avatar
                firstName={participant.firstName}
                lastName={participant.lastName}
                avatarUrl={participant.avatarUrl}
                size="sm"
              />
              <span className="text-sm">
                {participant.firstName} {participant.lastName}
              </span>
            </div>
          ))}

          {hasMore && (
            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              className="mt-1 text-sm text-primary hover:underline"
            >
              {expanded
                ? 'Voir moins'
                : `Voir tous (${goingParticipants.length})`}
            </button>
          )}
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          Soyez le premier à confirmer votre présence !
        </p>
      )}
    </section>
  );
}
