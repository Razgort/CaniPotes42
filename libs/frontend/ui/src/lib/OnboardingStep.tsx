import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from './cn';

interface OnboardingStepProps {
  currentStep: number;
  totalSteps: number;
  icon: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  onBack?: () => void;
  onContinue?: () => void;
  showSkip?: boolean;
  onSkip?: () => void;
  continueDisabled?: boolean;
  continueLabel?: string;
  isLoading?: boolean;
}

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2" role="progressbar" aria-valuenow={current + 1} aria-valuemin={1} aria-valuemax={total}>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={cn(
            'w-2.5 h-2.5 rounded-full transition-colors',
            i < current && 'bg-primary',
            i === current && 'bg-primary ring-2 ring-primary-light ring-offset-2',
            i > current && 'bg-border',
          )}
          aria-label={
            i < current ? `Etape ${i + 1} terminee` :
            i === current ? `Etape ${i + 1} en cours` :
            `Etape ${i + 1} a venir`
          }
        />
      ))}
    </div>
  );
}

export function OnboardingStep({
  currentStep,
  totalSteps,
  icon,
  title,
  subtitle,
  children,
  onBack,
  onContinue,
  showSkip = false,
  onSkip,
  continueDisabled = false,
  continueLabel = 'Continuer',
  isLoading = false,
}: OnboardingStepProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const firstInput = containerRef.current?.querySelector<HTMLElement>(
      'input, select, textarea, [tabindex="0"]',
    );
    if (firstInput) {
      // Small delay to ensure DOM is ready after step transition
      const timer = setTimeout(() => firstInput.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [currentStep]);

  return (
    <div className="flex flex-col min-h-[calc(100vh-56px)] w-full max-w-md mx-auto px-4 py-6">
      {/* Progress dots */}
      <ProgressDots current={currentStep} total={totalSteps} />

      {/* Back button */}
      <div className="mt-4 h-10">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1 text-muted hover:text-foreground transition-colors min-h-[44px] min-w-[44px]"
            aria-label="Retour"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-small">Retour</span>
          </button>
        )}
      </div>

      {/* Icon + Title */}
      <div className="text-center mt-4 mb-6">
        <span className="text-4xl" role="img" aria-hidden="true">{icon}</span>
        <h1 className="text-h1 text-foreground mt-3">{title}</h1>
        {subtitle && <p className="text-body text-muted mt-1">{subtitle}</p>}
      </div>

      {/* Step content */}
      <div ref={containerRef} className="flex-1">
        {children}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3 mt-6 pb-4">
        {onContinue && (
          <button
            type="button"
            onClick={onContinue}
            disabled={continueDisabled || isLoading}
            className="w-full rounded-lg bg-accent px-4 py-3 text-base font-medium text-white hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[48px]"
          >
            {isLoading ? 'Chargement...' : continueLabel}
          </button>
        )}
        {showSkip && onSkip && (
          <button
            type="button"
            onClick={onSkip}
            className="w-full rounded-lg border border-border px-4 py-3 text-base text-muted hover:text-foreground hover:border-foreground transition-colors min-h-[48px]"
          >
            Passer
          </button>
        )}
      </div>
    </div>
  );
}
