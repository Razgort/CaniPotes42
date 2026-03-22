import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from '@org/ui';
import { useAuth } from '@org/data-access';
import { ApiClientError } from '@org/data-access';
import { createInvitationSchema, type CreateInvitation } from '@org/types';
import { useCreateInvitations } from './hooks/useInvitations';

export function InviteForm() {
  const { activeClub, role } = useAuth();
  const createInvitations = useCreateInvitations(activeClub?.id ?? null);
  const [emailsText, setEmailsText] = useState('');

  const {
    handleSubmit,
    formState: { isSubmitting },
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<CreateInvitation>({
    resolver: zodResolver(createInvitationSchema),
    mode: 'onBlur',
  });

  if (role !== 'ADMIN' && role !== 'OWNER') {
    return null;
  }

  const parseEmails = (): string[] => {
    return emailsText
      .split(/[,\n]/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.length > 0);
  };

  const onSubmit = async () => {
    clearErrors();
    const emails = parseEmails();

    if (emails.length === 0) {
      setError('emails', { message: 'Au moins un email requis' });
      return;
    }

    if (emails.length > 10) {
      setError('emails', { message: 'Maximum 10 invitations à la fois' });
      return;
    }

    try {
      const result = await createInvitations.mutateAsync({ emails });
      const data = result.data ?? result;

      if (data.sent > 0) {
        toast.success(`Invitations envoyées (${data.sent})`);
      }

      if (data.duplicates && data.duplicates.length > 0) {
        toast.error(
          `Déjà invités : ${data.duplicates.join(', ')}`,
        );
      }

      setEmailsText('');
    } catch (error) {
      if (error instanceof ApiClientError) {
        toast.error(error.message);
      } else {
        toast.error('Une erreur est survenue');
      }
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="text-base font-medium text-foreground mb-3">
        Inviter des membres
      </h3>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label
            htmlFor="invite-emails"
            className="text-small font-medium text-foreground"
          >
            Adresses email
          </label>
          <textarea
            id="invite-emails"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-base text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            placeholder="un@exemple.com&#10;deux@exemple.com"
            rows={3}
            value={emailsText}
            onChange={(e) => setEmailsText(e.target.value)}
          />
          <p className="text-xs text-muted">
            Un email par ligne ou séparés par des virgules (max 10)
          </p>
          {errors.emails && (
            <p className="text-small text-danger">{errors.emails.message}</p>
          )}
        </div>
        <button
          type="submit"
          disabled={isSubmitting || emailsText.trim().length === 0}
          className="w-full rounded-lg bg-primary px-4 py-2 text-base font-medium text-white hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Envoi en cours...' : 'Envoyer les invitations'}
        </button>
      </form>
    </div>
  );
}

export default InviteForm;
