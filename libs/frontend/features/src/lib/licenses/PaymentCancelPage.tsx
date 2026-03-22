import { useNavigate } from 'react-router-dom';

export function PaymentCancelPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center px-4">
      <div className="text-4xl">ℹ️</div>
      <h1 className="text-lg font-semibold">Paiement annulé</h1>
      <p className="text-sm text-muted-foreground">
        Paiement annulé. Vous pouvez réessayer à tout moment.
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
