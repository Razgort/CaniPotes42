import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStripePaymentStatus } from './hooks/useLicenseTypes';
import { toast } from '@org/ui';

const MAX_POLL_SECONDS = 30;

export function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get('session_id');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timedOut = useRef(false);

  const { data } = useStripePaymentStatus(sessionId);
  const status = data?.data?.status;

  useEffect(() => {
    if (status === 'COMPLETED') {
      toast.success('Licence payée !');
      navigate('/licenses', { replace: true });
    }
  }, [status, navigate]);

  useEffect(() => {
    // Show timeout message after MAX_POLL_SECONDS if still PENDING
    timeoutRef.current = setTimeout(() => {
      timedOut.current = true;
    }, MAX_POLL_SECONDS * 1000);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  if (status === 'FAILED') {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center px-4">
        <div className="text-4xl">❌</div>
        <h1 className="text-lg font-semibold">Paiement échoué</h1>
        <p className="text-sm text-muted-foreground">
          Le paiement n'a pas pu être complété.
        </p>
        <button
          type="button"
          onClick={() => navigate('/licenses', { replace: true })}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center px-4">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      <h1 className="text-lg font-semibold">Paiement en cours de confirmation</h1>
      <p className="text-sm text-muted-foreground">
        Confirmation en cours... Vérifiez votre historique dans quelques instants.
      </p>
    </div>
  );
}
