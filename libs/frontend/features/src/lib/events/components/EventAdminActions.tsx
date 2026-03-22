import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, Trash2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@org/data-access';
import { useUpdateEventStatus, useDeleteEvent } from '../hooks/useEventMutations';
import type { EventStatus } from '@org/types';

interface EventAdminActionsProps {
  eventId: string;
  status: string;
  onDeleted?: () => void;
}

export function EventAdminActions({ eventId, status, onDeleted }: EventAdminActionsProps) {
  const { role } = useAuth();
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const statusMutation = useUpdateEventStatus(eventId);
  const deleteMutation = useDeleteEvent();

  if (role !== 'ADMIN' && role !== 'OWNER') return null;

  const isDraft = status === 'DRAFT';

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        {/* Publish / Unpublish */}
        {isDraft ? (
          <button
            type="button"
            disabled={statusMutation.isPending}
            onClick={() => statusMutation.mutate('PUBLISHED' as EventStatus)}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            <Eye className="h-4 w-4" />
            Publier
          </button>
        ) : (
          <button
            type="button"
            disabled={statusMutation.isPending}
            onClick={() => statusMutation.mutate('DRAFT' as EventStatus)}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
          >
            <EyeOff className="h-4 w-4" />
            Dépublier
          </button>
        )}

        {/* Edit */}
        <button
          type="button"
          onClick={() => navigate(`/events/${eventId}/edit`)}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted"
        >
          <Pencil className="h-4 w-4" />
          Modifier
        </button>

        {/* Delete */}
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className="flex items-center gap-1.5 rounded-lg border border-destructive/40 px-3 py-1.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4" />
          Supprimer
        </button>
      </div>

      {/* Delete confirmation dialog */}
      {confirmDelete && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div className="w-full max-w-sm rounded-xl bg-background p-6 shadow-xl">
            <h2 id="delete-dialog-title" className="text-base font-semibold">
              Supprimer cet événement ?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Cette action est irréversible. L&apos;événement et toutes les participations
              associées seront supprimés.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={deleteMutation.isPending}
                onClick={() => {
                  deleteMutation.mutate(eventId, {
                    onSuccess: () => {
                      setConfirmDelete(false);
                      onDeleted ? onDeleted() : navigate('/events');
                    },
                  });
                }}
                className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
