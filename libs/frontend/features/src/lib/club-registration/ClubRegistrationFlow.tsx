import { useState, useCallback } from 'react';
import { OnboardingStep } from '@org/ui';
import type { CreateClub } from '@org/types';
import { useCreateClub } from './hooks/useCreateClub';
import { SuccessScreen } from './components/SuccessScreen';

const TOTAL_STEPS = 4;

const FEDERATION_OPTIONS = [
  { value: 'FFSLC' as const, label: 'FFSLC — Federation Francaise des Sports et Loisirs Canins' },
  { value: 'CNEAC' as const, label: 'CNEAC — Commission Nationale Education et Activites Cynophiles' },
  { value: 'OTHER' as const, label: 'Autre federation' },
  { value: 'NONE' as const, label: 'Aucune affiliation' },
] as const;

interface FormData {
  name: string;
  federation: 'FFSLC' | 'CNEAC' | 'OTHER' | 'NONE' | '';
  logoFile: File | null;
  contactEmail: string;
  description: string;
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function ClubRegistrationFlow() {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    federation: '',
    logoFile: null,
    contactEmail: '',
    description: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSuccess, setShowSuccess] = useState(false);

  const createClubMutation = useCreateClub();

  const updateField = useCallback(<K extends keyof FormData>(key: K, value: FormData[K]) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    setErrors(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const goBack = useCallback(() => {
    setStep(prev => Math.max(0, prev - 1));
  }, []);

  // Step 1: Club Name
  const validateAndGoToStep2 = useCallback(() => {
    if (formData.name.trim().length < 2) {
      setErrors({ name: 'Le nom du club doit contenir au moins 2 caracteres' });
      return;
    }
    setStep(1);
  }, [formData.name]);

  // Step 2: Federation
  const validateAndGoToStep3 = useCallback(() => {
    if (!formData.federation) {
      setErrors({ federation: 'Veuillez selectionner une affiliation' });
      return;
    }
    setStep(2);
  }, [formData.federation]);

  // Step 3: Logo (optional, skip goes to step 4)
  const goToStep4 = useCallback(() => {
    setStep(3);
  }, []);

  if (showSuccess) {
    return <SuccessScreen clubName={formData.name} />;
  }

  return (
    <div>
      {step === 0 && (
        <OnboardingStep
          currentStep={0}
          totalSteps={TOTAL_STEPS}
          icon="🏠"
          title="Nom du club"
          subtitle="Comment s'appelle votre club ?"
          onContinue={validateAndGoToStep2}
          continueDisabled={formData.name.trim().length < 2}
        >
          <div className="flex flex-col gap-1">
            <label htmlFor="club-name" className="text-body-lg font-medium text-foreground">
              Nom du club <span className="text-danger">*</span>
            </label>
            <input
              id="club-name"
              type="text"
              value={formData.name}
              onChange={e => updateField('name', e.target.value)}
              onBlur={() => {
                if (formData.name.trim().length > 0 && formData.name.trim().length < 2) {
                  setErrors(prev => ({ ...prev, name: 'Le nom du club doit contenir au moins 2 caracteres' }));
                }
              }}
              className="w-full rounded-lg border border-border bg-card px-3 py-3 text-base text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Ex: Cani'potes 42"
              maxLength={100}
              autoComplete="organization"
            />
            {errors.name && (
              <p className="text-small text-danger" role="alert">{errors.name}</p>
            )}
          </div>
        </OnboardingStep>
      )}

      {step === 1 && (
        <OnboardingStep
          currentStep={1}
          totalSteps={TOTAL_STEPS}
          icon="🏅"
          title="Federation"
          subtitle="Votre club est-il affilie a une federation ?"
          onBack={goBack}
          onContinue={validateAndGoToStep3}
          continueDisabled={!formData.federation}
        >
          <fieldset className="flex flex-col gap-3">
            <legend className="sr-only">Affiliation federation</legend>
            {FEDERATION_OPTIONS.map(option => (
              <label
                key={option.value}
                className={`flex items-center gap-3 rounded-lg border px-4 py-3 cursor-pointer transition-colors min-h-[44px] ${
                  formData.federation === option.value
                    ? 'border-primary bg-primary-light'
                    : 'border-border hover:border-muted'
                }`}
              >
                <input
                  type="radio"
                  name="federation"
                  value={option.value}
                  checked={formData.federation === option.value}
                  onChange={() => updateField('federation', option.value)}
                  className="accent-primary w-4 h-4"
                />
                <span className="text-body text-foreground">{option.label}</span>
              </label>
            ))}
            {errors.federation && (
              <p className="text-small text-danger" role="alert">{errors.federation}</p>
            )}
          </fieldset>
        </OnboardingStep>
      )}

      {step === 2 && (
        <OnboardingStep
          currentStep={2}
          totalSteps={TOTAL_STEPS}
          icon="📸"
          title="Logo du club"
          subtitle="Ajoutez le logo de votre club (optionnel)"
          onBack={goBack}
          onContinue={goToStep4}
          showSkip
          onSkip={goToStep4}
          continueDisabled={!formData.logoFile}
          continueLabel="Continuer avec le logo"
        >
          <div className="flex flex-col items-center gap-4">
            {formData.logoFile ? (
              <div className="relative">
                <img
                  src={URL.createObjectURL(formData.logoFile)}
                  alt="Apercu du logo"
                  className="w-32 h-32 rounded-full object-cover border-2 border-primary"
                />
                <button
                  type="button"
                  onClick={() => updateField('logoFile', null)}
                  className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-danger text-white flex items-center justify-center text-small hover:bg-red-700"
                  aria-label="Supprimer le logo"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="w-32 h-32 rounded-full bg-border flex items-center justify-center">
                <span className="text-4xl text-muted">📷</span>
              </div>
            )}

            {/* Camera-first button */}
            <label className="flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-base font-medium text-white hover:bg-primary-hover cursor-pointer transition-colors min-h-[48px]">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M7 3L5.5 5H3C2.44772 5 2 5.44772 2 6V15C2 15.5523 2.44772 16 3 16H17C17.5523 16 18 15.5523 18 15V6C18 5.44772 17.5523 5 17 5H14.5L13 3H7Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                <circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              Prendre une photo
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                className="sr-only"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) {
                    if (file.size > 2 * 1024 * 1024) {
                      setErrors({ logoFile: 'Le fichier est trop volumineux (max 2 Mo)' });
                      return;
                    }
                    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
                      setErrors({ logoFile: 'Format non supporte. Utilisez JPEG, PNG ou WebP' });
                      return;
                    }
                    updateField('logoFile', file);
                  }
                }}
              />
            </label>

            {/* File picker secondary */}
            <label className="text-small text-primary underline cursor-pointer hover:text-primary-hover">
              Choisir un fichier
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) {
                    if (file.size > 2 * 1024 * 1024) {
                      setErrors({ logoFile: 'Le fichier est trop volumineux (max 2 Mo)' });
                      return;
                    }
                    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
                      setErrors({ logoFile: 'Format non supporte. Utilisez JPEG, PNG ou WebP' });
                      return;
                    }
                    updateField('logoFile', file);
                  }
                }}
              />
            </label>

            {errors.logoFile && (
              <p className="text-small text-danger" role="alert">{errors.logoFile}</p>
            )}
            <p className="text-small text-muted">JPEG, PNG ou WebP — max 2 Mo</p>
          </div>
        </OnboardingStep>
      )}

      {step === 3 && (
        <OnboardingStep
          currentStep={3}
          totalSteps={TOTAL_STEPS}
          icon="📧"
          title="Contact et description"
          subtitle="Comment peut-on joindre votre club ?"
          onBack={goBack}
          onContinue={() => {
            // Handler inline = `formData` du rendu courant (plus de ref / useCallback stale).
            const email = formData.contactEmail.trim();
            if (!validateEmail(email)) {
              setErrors({ contactEmail: "L'adresse email n'est pas valide" });
              return;
            }
            const name = formData.name.trim();
            if (name.length < 2 || !formData.federation) {
              return;
            }
            const dto: CreateClub = {
              name,
              federation: formData.federation,
              contactEmail: email,
              description: formData.description.trim() || undefined,
            };
            void createClubMutation.mutateAsync(dto).then(
              () => setShowSuccess(true),
              () => {
                /* toast dans useCreateClub */
              },
            );
          }}
          continueDisabled={!formData.contactEmail || createClubMutation.isPending}
          continueLabel="Creer le club"
          isLoading={createClubMutation.isPending}
        >
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="contact-email" className="text-body-lg font-medium text-foreground">
                Email de contact <span className="text-danger">*</span>
              </label>
              <input
                id="contact-email"
                type="email"
                value={formData.contactEmail}
                onChange={e => updateField('contactEmail', e.target.value)}
                onBlur={() => {
                  if (formData.contactEmail && !validateEmail(formData.contactEmail)) {
                    setErrors(prev => ({ ...prev, contactEmail: "L'adresse email n'est pas valide" }));
                  }
                }}
                className="w-full rounded-lg border border-border bg-card px-3 py-3 text-base text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="contact@monclub.fr"
                autoComplete="email"
              />
              {errors.contactEmail && (
                <p className="text-small text-danger" role="alert">{errors.contactEmail}</p>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="description" className="text-body-lg font-medium text-foreground">
                Description <span className="text-muted font-normal">(optionnel)</span>
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={e => updateField('description', e.target.value)}
                className="w-full rounded-lg border border-border bg-card px-3 py-3 text-base text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary min-h-[100px] resize-y"
                placeholder="Decrivez votre club en quelques mots..."
                maxLength={500}
              />
              <p className="text-small text-muted text-right">{formData.description.length}/500</p>
            </div>
          </div>
        </OnboardingStep>
      )}
    </div>
  );
}

export default ClubRegistrationFlow;
