import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface SuccessScreenProps {
  clubName: string;
}

export function SuccessScreen({ clubName }: SuccessScreenProps) {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/', { replace: true });
    }, 3000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-56px)] px-4 text-center">
      <span className="text-6xl mb-6" role="img" aria-hidden="true">🎉</span>
      <h1 className="text-h1 text-foreground mb-2">Club cree avec succes !</h1>
      <p className="text-body-lg text-muted mb-8">
        Bienvenue dans <strong className="text-foreground">{clubName}</strong> !
        <br />
        Vous etes maintenant proprietaire de votre club.
      </p>

      <button
        type="button"
        onClick={() => navigate('/', { replace: true })}
        className="rounded-lg bg-accent px-6 py-3 text-base font-medium text-white hover:bg-accent-hover transition-colors min-h-[48px]"
      >
        Acceder au tableau de bord
      </button>

      <p className="text-small text-muted mt-4">
        Redirection automatique dans quelques secondes...
      </p>
    </div>
  );
}
