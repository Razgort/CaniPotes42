import { useState, useDeferredValue } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, UserPlus } from 'lucide-react';
import { useAuth } from '@org/data-access';
import { MemberCard, SkeletonList, cn } from '@org/ui';
import { useMembers } from './hooks/useMembers';
import { MemberActions } from './components/MemberActions';

const ROLE_FILTERS = [
  { label: 'Tous', value: '' },
  { label: 'Admin', value: 'ADMIN' },
  { label: 'Membre', value: 'MEMBER' },
] as const;

export function MemberDirectory() {
  const navigate = useNavigate();
  const { activeClub, role, user } = useAuth();
  const clubId = activeClub?.id ?? null;

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);

  const deferredSearch = useDeferredValue(search);

  const isAdminOrOwner = role === 'ADMIN' || role === 'OWNER';

  const { data, isLoading } = useMembers(clubId, {
    search: isAdminOrOwner ? deferredSearch : undefined,
    role: isAdminOrOwner && roleFilter ? roleFilter : undefined,
    page,
  });

  const members = data?.data ?? [];
  const meta = data?.meta;

  if (isLoading) return <SkeletonList />;

  // Empty state
  if (members.length === 0 && !deferredSearch && !roleFilter) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <div className="text-4xl">👥</div>
        <p className="text-muted-foreground">
          Invitez votre equipe pour commencer
        </p>
        {isAdminOrOwner && (
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            onClick={() => navigate('/invite')}
          >
            <UserPlus className="h-4 w-4" />
            Inviter
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Membres</h1>
      </div>

      {/* Search & filters — admin/owner only */}
      {isAdminOrOwner && (
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Rechercher par nom ou email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="flex gap-2">
            {ROLE_FILTERS.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => {
                  setRoleFilter(filter.value);
                  setPage(1);
                }}
                className={cn(
                  'rounded-full px-3 py-1 text-sm font-medium transition-colors',
                  roleFilter === filter.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80',
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Mobile: card list */}
      <div className="space-y-2 lg:hidden">
        {members.map((member) => (
          <div key={member.id} className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <MemberCard
                firstName={member.firstName}
                lastName={member.lastName}
                avatarUrl={member.avatarUrl}
                role={member.role}
                onClick={() => navigate(`/members/${member.id}`)}
              />
            </div>
            {isAdminOrOwner && member.status === 'SUSPENDED' && (
              <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                Suspendu
              </span>
            )}
            {clubId && role && user && (
              <MemberActions
                member={member}
                clubId={clubId}
                callerRole={role as 'OWNER' | 'ADMIN' | 'MEMBER'}
                callerUserId={user.id}
              />
            )}
          </div>
        ))}
      </div>

      {/* Desktop: data table */}
      <div className="hidden lg:block">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b text-left text-sm text-muted-foreground">
              <th className="pb-2 font-medium">Nom</th>
              <th className="pb-2 font-medium">Email</th>
              <th className="pb-2 font-medium">Rôle</th>
              <th className="pb-2 font-medium">Membre depuis</th>
              {isAdminOrOwner && <th className="pb-2 font-medium w-10" />}
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr
                key={member.id}
                className="cursor-pointer border-b transition-colors hover:bg-accent/50"
                onClick={() => navigate(`/members/${member.id}`)}
              >
                <td className="py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                      {member.firstName[0]}
                      {member.lastName[0]}
                    </div>
                    <span className="font-medium">
                      {member.firstName} {member.lastName}
                    </span>
                  </div>
                </td>
                <td className="py-3 text-sm text-muted-foreground">
                  {member.email}
                </td>
                <td className="py-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                        member.role === 'OWNER' && 'bg-amber-100 text-amber-800',
                        member.role === 'ADMIN' && 'bg-blue-100 text-blue-800',
                        member.role === 'MEMBER' && 'bg-gray-100 text-gray-700',
                      )}
                    >
                      {member.role === 'OWNER'
                        ? 'Propriétaire'
                        : member.role === 'ADMIN'
                          ? 'Admin'
                          : 'Membre'}
                    </span>
                    {isAdminOrOwner && member.status === 'SUSPENDED' && (
                      <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                        Suspendu
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-3 text-sm text-muted-foreground">
                  {new Date(member.createdAt).toLocaleDateString('fr-FR')}
                </td>
                {isAdminOrOwner && clubId && role && user && (
                  <td className="py-3" onClick={(e) => e.stopPropagation()}>
                    <MemberActions
                      member={member}
                      clubId={clubId}
                      callerRole={role as 'OWNER' | 'ADMIN' | 'MEMBER'}
                      callerUserId={user.id}
                    />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {meta && meta.total > meta.pageSize && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-lg border px-3 py-1 text-sm disabled:opacity-50"
          >
            Précédent
          </button>
          <span className="text-sm text-muted-foreground">
            Page {page} / {Math.ceil(meta.total / meta.pageSize)}
          </span>
          <button
            type="button"
            disabled={page >= Math.ceil(meta.total / meta.pageSize)}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border px-3 py-1 text-sm disabled:opacity-50"
          >
            Suivant
          </button>
        </div>
      )}
    </div>
  );
}

export default MemberDirectory;
