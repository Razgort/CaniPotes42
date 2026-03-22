import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit } from 'lucide-react';
import { useAuth } from '@org/data-access';
import { Avatar, RoleBadge, SkeletonList } from '@org/ui';
import { useMemberDetail } from './hooks/useMembers';
import { ProfileEditForm } from './ProfileEditForm';

export function MemberProfile() {
  const { memberId } = useParams<{ memberId: string }>();
  const navigate = useNavigate();
  const { activeClub, user } = useAuth();
  const clubId = activeClub?.id ?? null;

  const [isEditing, setIsEditing] = useState(false);

  const { data, isLoading } = useMemberDetail(clubId, memberId);
  const member = data?.data;

  if (isLoading) return <SkeletonList />;
  if (!member) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        Membre introuvable
      </div>
    );
  }

  const isOwnProfile = member.userId === user?.id;

  if (isEditing && isOwnProfile) {
    return (
      <div className="mx-auto max-w-md space-y-4">
        <button
          type="button"
          onClick={() => setIsEditing(false)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </button>
        <h1 className="text-xl font-semibold">Modifier le profil</h1>
        <ProfileEditForm
          memberId={member.id}
          firstName={member.firstName}
          lastName={member.lastName}
          avatarUrl={member.avatarUrl}
          onDone={() => setIsEditing(false)}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <button
        type="button"
        onClick={() => navigate('/members')}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Membres
      </button>

      <div className="flex flex-col items-center gap-4 pt-4">
        <Avatar
          firstName={member.firstName}
          lastName={member.lastName}
          avatarUrl={member.avatarUrl}
          size="lg"
        />
        <div className="text-center">
          <h1 className="text-xl font-semibold">
            {member.firstName} {member.lastName}
          </h1>
          <p className="text-sm text-muted-foreground">{member.email}</p>
        </div>
        <RoleBadge role={member.role} />
        <p className="text-xs text-muted-foreground">
          Membre depuis le{' '}
          {new Date(member.createdAt).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>
      </div>

      {isOwnProfile && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent/50"
          >
            <Edit className="h-4 w-4" />
            Modifier
          </button>
        </div>
      )}
    </div>
  );
}

export default MemberProfile;
