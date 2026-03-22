import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * HelloAsso redirects here after the user completes (or closes) the checkout.
 * Payment confirmation is async via webhook — we just show a pending message
 * and redirect to the licenses page after a short delay.
 */
export default function HelloAssoReturnPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/licenses', { replace: true });
    }, 3000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center px-4">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      <h1 className="text-lg font-semibold">Paiement en cours de confirmation</h1>
      <p className="text-sm text-muted-foreground">
        HelloAsso confirme votre paiement. Vous serez redirigé automatiquement.
      </p>
      <button
        type="button"
        onClick={() => navigate('/licenses', { replace: true })}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        Retour aux licences
      </button>
    </div>
  );
}
