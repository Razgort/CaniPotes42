import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const {
  mockUploadCertificate,
  mockToastSuccess,
  mockToastError,
} = vi.hoisted(() => ({
  mockUploadCertificate: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
}));

vi.mock('./hooks/useVaccines', () => ({
  useUploadCertificate: () => ({
    mutateAsync: mockUploadCertificate,
    isPending: false,
  }),
}));

vi.mock('@org/ui', async () => {
  const actual = await vi.importActual<typeof import('@org/ui')>('@org/ui');
  return { ...actual, toast: { success: mockToastSuccess, error: mockToastError } };
});

import { CertificateUpload } from './CertificateUpload';

function renderUpload(props: Partial<React.ComponentProps<typeof CertificateUpload>> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const defaults = {
    clubId: 'club-1',
    dogId: 'dog-1',
    vaccineId: 'vax-1',
    vaccineName: 'Rage',
    onComplete: vi.fn(),
    onSkip: vi.fn(),
  };
  return render(
    <QueryClientProvider client={queryClient}>
      <CertificateUpload {...defaults} {...props} />
    </QueryClientProvider>,
  );
}

describe('CertificateUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders vaccine name and primary camera button', () => {
    renderUpload();
    expect(screen.getByText('Rage')).toBeTruthy();
    expect(screen.getByRole('button', { name: /prendre en photo/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /choisir un fichier/i })).toBeTruthy();
  });

  it('calls onSkip when skip button clicked', async () => {
    const user = userEvent.setup();
    const onSkip = vi.fn();
    renderUpload({ onSkip });
    await user.click(screen.getByRole('button', { name: /passer/i }));
    expect(onSkip).toHaveBeenCalled();
  });

  it('shows preview after file selected via file picker', async () => {
    const user = userEvent.setup();
    renderUpload();

    const file = new File(['dummy'], 'cert.jpg', { type: 'image/jpeg' });
    const fileInput = screen.getByLabelText(/choisir un fichier/i);
    await user.upload(fileInput, file);

    expect(screen.getByAltText(/aperçu/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /reprendre/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /confirmer/i })).toBeTruthy();
  });

  it('uploads file and calls onComplete on confirm', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    mockUploadCertificate.mockResolvedValue({});
    renderUpload({ onComplete });

    const file = new File(['dummy'], 'cert.jpg', { type: 'image/jpeg' });
    const fileInput = screen.getByLabelText(/choisir un fichier/i);
    await user.upload(fileInput, file);

    await user.click(screen.getByRole('button', { name: /confirmer/i }));

    await waitFor(() => {
      expect(mockUploadCertificate).toHaveBeenCalledWith(
        expect.objectContaining({ vaccineId: 'vax-1', file }),
      );
      expect(mockToastSuccess).toHaveBeenCalledWith('Certificat ajouté');
      expect(onComplete).toHaveBeenCalled();
    });
  });

  it('shows error toast when upload fails', async () => {
    const user = userEvent.setup();
    mockUploadCertificate.mockRejectedValue(new Error('Upload failed'));
    renderUpload();

    const file = new File(['dummy'], 'cert.jpg', { type: 'image/jpeg' });
    const fileInput = screen.getByLabelText(/choisir un fichier/i);
    await user.upload(fileInput, file);

    await user.click(screen.getByRole('button', { name: /confirmer/i }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalled();
    });
  });

  it('clears preview when retake clicked', async () => {
    const user = userEvent.setup();
    renderUpload();

    const file = new File(['dummy'], 'cert.jpg', { type: 'image/jpeg' });
    const fileInput = screen.getByLabelText(/choisir un fichier/i);
    await user.upload(fileInput, file);

    expect(screen.getByAltText(/aperçu/i)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Reprendre' }));

    expect(screen.queryByAltText(/aperçu/i)).toBeNull();
    expect(screen.getByRole('button', { name: /prendre en photo/i })).toBeTruthy();
  });
});
