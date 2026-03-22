import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { toast } from '@org/ui';
import { ApiClientError } from '@org/data-access';
import { registerWithConsentSchema, type RegisterWithConsent, type RegisterWithConsentInput } from './hooks/types';
import { useRegister } from './hooks/useRegister';

const ERROR_CODE_MESSAGES: Record<string, string> = {
  CONFLICT: 'Cette adresse email est deja utilisee.',
};

export function RegisterForm() {
  const navigate = useNavigate();
  const registerMutation = useRegister();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<RegisterWithConsentInput, unknown, RegisterWithConsent>({
    resolver: zodResolver(registerWithConsentSchema),
    mode: 'onBlur',
    defaultValues: {
      email: '',
      password: '',
      acceptOptionalData: false,
    },
  });

  useEffect(() => {
    const emailInput = document.getElementById('register-email');
    emailInput?.focus();
  }, []);

  const onSubmit = async (data: RegisterWithConsent) => {
    try {
      await registerMutation.mutateAsync(data);
      toast.success('Votre compte a ete cree avec succes');
      navigate('/login');
    } catch (error) {
      if (error instanceof ApiClientError) {
        const frenchMessage =
          ERROR_CODE_MESSAGES[error.errorCode] || error.message;

        if (error.statusCode === 409) {
          setError('email', { message: frenchMessage });
        } else {
          toast.error(frenchMessage);
        }
      } else {
        toast.error('Une erreur est survenue, veuillez reessayer');
      }
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <h1 className="text-h1 text-foreground mb-6">Creer un compte</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        {/* Email */}
        <div className="flex flex-col gap-1">
          <label htmlFor="register-email" className="text-small font-medium text-foreground">
            Email <span className="text-danger">*</span>
          </label>
          <input
            id="register-email"
            type="email"
            autoComplete="email"
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-base text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="votre@email.com"
            {...register('email')}
          />
          {errors.email && (
            <p className="text-small text-danger">{errors.email.message}</p>
          )}
        </div>

        {/* Password */}
        <div className="flex flex-col gap-1">
          <label htmlFor="register-password" className="text-small font-medium text-foreground">
            Mot de passe <span className="text-danger">*</span>
          </label>
          <input
            id="register-password"
            type="password"
            autoComplete="new-password"
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-base text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Minimum 8 caracteres"
            {...register('password')}
          />
          {errors.password && (
            <p className="text-small text-danger">{errors.password.message}</p>
          )}
        </div>

        {/* Privacy Notice */}
        <div className="mt-2 rounded-lg border border-border bg-card p-4">
          <h2 className="text-small font-medium text-foreground mb-2">
            Confidentialite et donnees personnelles
          </h2>
          <p className="text-small text-muted mb-3">
            CaniFed collecte votre adresse email pour gerer votre compte.
            Vos donnees sont stockees de maniere securisee et ne sont jamais partagees avec des tiers.
          </p>

          {/* Required: Privacy Notice */}
          <div className="flex items-start gap-2 mb-2">
            <input
              id="register-privacy"
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-border accent-primary"
              {...register('acceptPrivacyNotice')}
            />
            <label htmlFor="register-privacy" className="text-small text-foreground">
              J'accepte la{' '}
              <a href="/privacy" className="text-primary underline" target="_blank" rel="noopener noreferrer">
                politique de confidentialite
              </a>{' '}
              <span className="text-danger">*</span>
            </label>
          </div>
          {errors.acceptPrivacyNotice && (
            <p className="text-small text-danger mb-2">{errors.acceptPrivacyNotice.message}</p>
          )}

          {/* Optional: Data Collection */}
          <div className="flex items-start gap-2">
            <input
              id="register-optional-data"
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-border accent-primary"
              {...register('acceptOptionalData')}
            />
            <label htmlFor="register-optional-data" className="text-small text-muted">
              J'accepte que mes photos et communications soient utilisees pour ameliorer le service (optionnel)
            </label>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg bg-primary px-4 py-3 text-base font-medium text-white hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Creation en cours...' : 'Creer mon compte'}
        </button>

        <p className="text-small text-muted text-center">
          Deja un compte ?{' '}
          <a href="/login" className="text-primary underline">
            Se connecter
          </a>
        </p>
      </form>
    </div>
  );
}

export default RegisterForm;
