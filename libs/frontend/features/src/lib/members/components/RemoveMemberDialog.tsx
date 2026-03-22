import { toast } from '@org/ui';
import { useRemoveMember } from '../hooks/useMembers';
import type { MemberDto } from '../hooks/useMembers';

interface RemoveMemberDialogProps {
  member: MemberDto;
  clubId: string;
  onClose: () => void;
}

export function RemoveMemberDialog({ member, clubId, onClose }: RemoveMemberDialogProps) {
  const mutation = useRemoveMember(clubId);

  const handleConfirm = () => {
    mutation.mutate(
      { memberId: member.id },
      {
        onSuccess: () => {
          toast.success(`${member.firstName} a été retiré du club`);
          onClose();
        },
        onError: (error) => {
          toast.error(error.message);
        },
      },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-2xl bg-background p-6 shadow-xl mx-4">
        <h2 className="text-lg font-semibold mb-1">
          Retirer {member.firstName} du club ?
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          {member.firstName} ne pourra plus voir les événements, documents ou le chat du club.
        </p>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-accent/50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={mutation.isPending}
            className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {mutation.isPending ? 'En cours...' : 'Retirer'}
          </button>
        </div>
      </div>
    </div>
  );
}
