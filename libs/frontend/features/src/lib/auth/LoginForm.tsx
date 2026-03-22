import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from '@org/ui';
import { ApiClientError, useAuth } from '@org/data-access';
import { loginSchema, type Login } from '@org/types';
import { useLogin } from './hooks/useLogin';

export function LoginForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login: setAuth } = useAuth();
  const loginMutation = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Login>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
    defaultValues: {
      email: '',
      password: '',
    },
  });

  useEffect(() => {
    const emailInput = document.getElementById('login-email');
    emailInput?.focus();
  }, []);

  const onSubmit = async (data: Login) => {
    try {
      const response = await loginMutation.mutateAsync(data);
      setAuth(response.data);
      toast.success('Connexion reussie');

      const from = (location.state as { from?: string })?.from;

      if (!response.data.activeClub) {
        navigate('/club-setup', { replace: true });
      } else if (from) {
        navigate(from, { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (error) {
      if (error instanceof ApiClientError) {
        toast.error('Email ou mot de passe incorrect');
      } else {
        toast.error('Une erreur est survenue, veuillez reessayer');
      }
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <h1 className="text-h1 text-foreground mb-6">Se connecter</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        {/* Email */}
        <div className="flex flex-col gap-1">
          <label htmlFor="login-email" className="text-small font-medium text-foreground">
            Email <span className="text-danger">*</span>
          </label>
          <input
            id="login-email"
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
          <label htmlFor="login-password" className="text-small font-medium text-foreground">
            Mot de passe <span className="text-danger">*</span>
          </label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-base text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Votre mot de passe"
            {...register('password')}
          />
          {errors.password && (
            <p className="text-small text-danger">{errors.password.message}</p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg bg-primary px-4 py-3 text-base font-medium text-white hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Connexion en cours...' : 'Se connecter'}
        </button>

        <p className="text-small text-muted text-center">
          Pas encore de compte ?{' '}
          <a href="/register" className="text-primary underline">
            Creer un compte
          </a>
        </p>
      </form>
    </div>
  );
}

export default LoginForm;
