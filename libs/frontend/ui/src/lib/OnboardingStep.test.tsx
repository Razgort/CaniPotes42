import { render, screen, fireEvent } from '@testing-library/react';
import { OnboardingStep } from './OnboardingStep';

describe('OnboardingStep', () => {
  const defaultProps = {
    currentStep: 0,
    totalSteps: 4,
    icon: '🏠',
    title: 'Nom du club',
    children: <input data-testid="test-input" />,
  };

  it('renders title and icon', () => {
    render(<OnboardingStep {...defaultProps} />);
    expect(screen.getByText('Nom du club')).toBeInTheDocument();
    expect(screen.getByText('🏠')).toBeInTheDocument();
  });

  it('renders subtitle when provided', () => {
    render(<OnboardingStep {...defaultProps} subtitle="Comment s'appelle votre club ?" />);
    expect(screen.getByText("Comment s'appelle votre club ?")).toBeInTheDocument();
  });

  it('renders correct number of progress dots', () => {
    render(<OnboardingStep {...defaultProps} />);
    const progressbar = screen.getByRole('progressbar');
    const dots = progressbar.querySelectorAll('span');
    expect(dots).toHaveLength(4);
  });

  it('marks completed steps with filled style', () => {
    render(<OnboardingStep {...defaultProps} currentStep={2} />);
    const progressbar = screen.getByRole('progressbar');
    const dots = progressbar.querySelectorAll('span');
    // Step 0 and 1 should be completed (bg-primary)
    expect(dots[0]?.className).toContain('bg-primary');
    expect(dots[1]?.className).toContain('bg-primary');
    // Step 2 is current (ring)
    expect(dots[2]?.className).toContain('ring-2');
    // Step 3 is future (bg-border)
    expect(dots[3]?.className).toContain('bg-border');
  });

  it('renders children content', () => {
    render(<OnboardingStep {...defaultProps} />);
    expect(screen.getByTestId('test-input')).toBeInTheDocument();
  });

  it('shows back button when onBack is provided', () => {
    const onBack = vi.fn();
    render(<OnboardingStep {...defaultProps} onBack={onBack} />);
    const backButton = screen.getByLabelText('Retour');
    expect(backButton).toBeInTheDocument();
    fireEvent.click(backButton);
    expect(onBack).toHaveBeenCalledOnce();
  });

  it('does not show back button when onBack is not provided', () => {
    render(<OnboardingStep {...defaultProps} />);
    expect(screen.queryByLabelText('Retour')).not.toBeInTheDocument();
  });

  it('renders continue button when onContinue is provided', () => {
    const onContinue = vi.fn();
    render(<OnboardingStep {...defaultProps} onContinue={onContinue} />);
    const continueBtn = screen.getByText('Continuer');
    fireEvent.click(continueBtn);
    expect(onContinue).toHaveBeenCalledOnce();
  });

  it('disables continue button when continueDisabled is true', () => {
    render(<OnboardingStep {...defaultProps} onContinue={() => {}} continueDisabled />);
    expect(screen.getByText('Continuer')).toBeDisabled();
  });

  it('renders custom continue label', () => {
    render(<OnboardingStep {...defaultProps} onContinue={() => {}} continueLabel="Creer le club" />);
    expect(screen.getByText('Creer le club')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<OnboardingStep {...defaultProps} onContinue={() => {}} isLoading />);
    expect(screen.getByText('Chargement...')).toBeInTheDocument();
  });

  it('renders skip button when showSkip is true', () => {
    const onSkip = vi.fn();
    render(<OnboardingStep {...defaultProps} showSkip onSkip={onSkip} />);
    const skipBtn = screen.getByText('Passer');
    fireEvent.click(skipBtn);
    expect(onSkip).toHaveBeenCalledOnce();
  });

  it('does not render skip button by default', () => {
    render(<OnboardingStep {...defaultProps} />);
    expect(screen.queryByText('Passer')).not.toBeInTheDocument();
  });

  it('auto-focuses first input on mount', async () => {
    render(<OnboardingStep {...defaultProps} />);
    // Wait for the focus timeout
    await new Promise(resolve => setTimeout(resolve, 150));
    expect(screen.getByTestId('test-input')).toHaveFocus();
  });
});
