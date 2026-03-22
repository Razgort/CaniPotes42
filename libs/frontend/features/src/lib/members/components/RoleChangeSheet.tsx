import { useState } from 'react';
import { toast } from '@org/ui';
import { useUpdateMemberRole } from '../hooks/useMembers';
import type { MemberDto } from '../hooks/useMembers';

interface RoleChangeSheetProps {
  member: MemberDto;
  clubId: string;
  onClose: () => void;
}

const ROLES = [
  { value: 'ADMIN' as const, label: 'Admin' },
  { value: 'MEMBER' as const, label: 'Membre' },
] as const;

export function RoleChangeSheet({ member, clubId, onClose }: RoleChangeSheetProps) {
  const [selectedRole, setSelectedRole] = useState<'ADMIN' | 'MEMBER'>(
    member.role === 'OWNER' ? 'ADMIN' : (member.role as 'ADMIN' | 'MEMBER'),
  );
  const mutation = useUpdateMemberRole(clubId);

  const handleConfirm = () => {
    mutation.mutate(
      { memberId: member.id, data: { role: selectedRole } },
      {
        onSuccess: () => {
          const roleLabel = selectedRole === 'ADMIN' ? 'Admin' : 'Membre';
          toast.success(`${member.firstName} est maintenant ${roleLabel}`);
          onClose();
        },
        onError: (error) => {
          toast.error(error.message);
        },
      },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-background p-6 shadow-xl">
        <h2 className="text-lg font-semibold mb-1">
          Changer le r&ocirc;le
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          {member.firstName} {member.lastName}
        </p>

        <div className="space-y-2 mb-6">
          {ROLES.map((role) => (
            <label
              key={role.value}
              className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                selectedRole === role.value
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:bg-accent/50'
              }`}
            >
              <input
                type="radio"
                name="role"
                value={role.value}
                checked={selectedRole === role.value}
                onChange={() => setSelectedRole(role.value)}
                className="accent-primary"
              />
              <span className="font-medium">{role.label}</span>
            </label>
          ))}
        </div>

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
            disabled={mutation.isPending || selectedRole === member.role}
            className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {mutation.isPending ? 'En cours...' : 'Confirmer'}
          </button>
        </div>
      </div>
    </div>
  );
}
