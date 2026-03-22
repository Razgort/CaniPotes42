import { useState, useRef, useEffect } from 'react';
import { MoreVertical } from 'lucide-react';
import { toast } from '@org/ui';
import { useUnsuspendMember } from '../hooks/useMembers';
import type { MemberDto } from '../hooks/useMembers';
import { RoleChangeSheet } from './RoleChangeSheet';
import { RemoveMemberDialog } from './RemoveMemberDialog';
import { SuspendMemberDialog } from './SuspendMemberDialog';

type DialogType = 'role' | 'remove' | 'suspend' | null;

interface MemberActionsProps {
  member: MemberDto;
  clubId: string;
  callerRole: 'OWNER' | 'ADMIN' | 'MEMBER';
  callerUserId: string;
}

export function MemberActions({ member, clubId, callerRole, callerUserId }: MemberActionsProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeDialog, setActiveDialog] = useState<DialogType>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const unsuspendMutation = useUnsuspendMember(clubId);

  // Don't show actions for regular members
  if (callerRole === 'MEMBER') return null;

  // Admin cannot act on Owner rows
  if (callerRole === 'ADMIN' && member.role === 'OWNER') return null;

  // Owner cannot remove/suspend themselves if sole owner (handled server-side, but hide self-actions)
  const isSelf = member.userId === callerUserId;

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const handleUnsuspend = () => {
    setMenuOpen(false);
    unsuspendMutation.mutate(
      { memberId: member.id },
      {
        onSuccess: () => toast.success(`${member.firstName} a été réactivé`),
        onError: (error) => toast.error(error.message),
      },
    );
  };

  const openDialog = (type: DialogType) => {
    setMenuOpen(false);
    setActiveDialog(type);
  };

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen(!menuOpen);
          }}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent/50"
          aria-label="Actions membre"
        >
          <MoreVertical className="h-4 w-4" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full z-40 mt-1 min-w-[180px] rounded-lg border bg-background py-1 shadow-lg">
            {!isSelf && member.role !== 'OWNER' && (
              <button
                type="button"
                onClick={() => openDialog('role')}
                className="w-full px-3 py-2 text-left text-sm hover:bg-accent/50"
              >
                Changer le r&ocirc;le
              </button>
            )}

            {!isSelf && member.role !== 'OWNER' && member.status !== 'SUSPENDED' && (
              <button
                type="button"
                onClick={() => openDialog('suspend')}
                className="w-full px-3 py-2 text-left text-sm hover:bg-accent/50"
              >
                Suspendre
              </button>
            )}

            {member.status === 'SUSPENDED' && (
              <button
                type="button"
                onClick={handleUnsuspend}
                className="w-full px-3 py-2 text-left text-sm hover:bg-accent/50"
              >
                R&eacute;activer
              </button>
            )}

            {!isSelf && member.role !== 'OWNER' && (
              <button
                type="button"
                onClick={() => openDialog('remove')}
                className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
              >
                Retirer du club
              </button>
            )}
          </div>
        )}
      </div>

      {activeDialog === 'role' && (
        <RoleChangeSheet
          member={member}
          clubId={clubId}
          onClose={() => setActiveDialog(null)}
        />
      )}

      {activeDialog === 'remove' && (
        <RemoveMemberDialog
          member={member}
          clubId={clubId}
          onClose={() => setActiveDialog(null)}
        />
      )}

      {activeDialog === 'suspend' && (
        <SuspendMemberDialog
          member={member}
          clubId={clubId}
          onClose={() => setActiveDialog(null)}
        />
      )}
    </>
  );
}
