import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@org/data-access';
import {
  useInvitationStatus,
  useAcceptInvitation,
} from '../members/hooks/useInvitations';

export function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { data, isLoading, error } = useInvitationStatus(token);
  const acceptMutation = useAcceptInvitation();

  const status = data?.data?.status ?? (data as any)?.status;
  const clubName = data?.data?.clubName ?? (data as any)?.clubName;

  useEffect(() => {
    if (!token || isLoading || !status) return;

    if (status === 'already_accepted') {
      navigate(isAuthenticated ? '/events' : '/login', { replace: true });
      return;
    }

    if (status === 'valid' && isAuthenticated) {
      acceptMutation.mutate(
        { token },
        {
          onSuccess: () => {
            navigate('/events', { replace: true });
          },
        },
      );
    }
  }, [token, status, isAuthenticated, isLoading]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted">Chargement...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="w-full max-w-md mx-auto text-center py-16">
        <h1 className="text-h1 text-foreground mb-4">Invitation introuvable</h1>
        <p className="text-muted mb-6">
          Cette invitation n'existe pas ou le lien est invalide.
        </p>
        <a
          href="/login"
          className="inline-block rounded-lg bg-primary px-6 py-2 text-white font-medium hover:bg-primary-hover transition-colors"
        >
          Se connecter
        </a>
      </div>
    );
  }

  if (status === 'expired') {
    return (
      <div className="w-full max-w-md mx-auto text-center py-16">
        <h1 className="text-h1 text-foreground mb-4">Invitation expirée</h1>
        <p className="text-muted mb-6">
          Cette invitation a expiré. Demandez à un administrateur de vous
          renvoyer une invitation.
        </p>
        <a
          href="/login"
          className="inline-block rounded-lg bg-primary px-6 py-2 text-white font-medium hover:bg-primary-hover transition-colors"
        >
          Se connecter
        </a>
      </div>
    );
  }

  if (status === 'valid' && !isAuthenticated) {
    return (
      <div className="w-full max-w-md mx-auto text-center py-16">
        <h1 className="text-h1 text-foreground mb-4">
          Rejoindre {clubName}
        </h1>
        <p className="text-muted mb-6">
          Créez votre compte pour rejoindre {clubName}
        </p>
        <a
          href={`/register?invite=${token}`}
          className="inline-block rounded-lg bg-primary px-6 py-2 text-white font-medium hover:bg-primary-hover transition-colors mb-3"
        >
          Créer un compte
        </a>
        <p className="text-small text-muted">
          Déjà un compte ?{' '}
          <a href={`/login?invite=${token}`} className="text-primary underline">
            Se connecter
          </a>
        </p>
      </div>
    );
  }

  if (acceptMutation.isPending) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted">Rejoindre le club en cours...</p>
      </div>
    );
  }

  return null;
}

export default InvitePage;
