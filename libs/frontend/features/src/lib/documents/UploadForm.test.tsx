import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DocumentType } from '@org/types';

// Mocks
const mockUseUploadDocument = jest.fn();
const mockToast = { success: jest.fn(), error: jest.fn() };

jest.mock('./hooks/useDocuments', () => ({
  useUploadDocument: (...args: unknown[]) => mockUseUploadDocument(...args),
}));

jest.mock('@org/ui', () => ({
  toast: { success: (...args: unknown[]) => mockToast.success(...args), error: (...args: unknown[]) => mockToast.error(...args) },
  cn: (...classes: unknown[]) => classes.filter(Boolean).join(' '),
}));

import { UploadForm } from './UploadForm';

function renderUploadForm(props: Partial<React.ComponentProps<typeof UploadForm>> = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <UploadForm clubId="club-1" {...props} />
    </QueryClientProvider>,
  );
}

describe('UploadForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseUploadDocument.mockReturnValue({ mutate: jest.fn(), isPending: false });
  });

  it('renders camera-first upload button prominently', () => {
    renderUploadForm();
    expect(screen.getByText('Prendre en photo')).toBeInTheDocument();
    expect(screen.getByText('Choisir un fichier')).toBeInTheDocument();
  });

  it('camera button appears before file picker button', () => {
    renderUploadForm();
    const cameraBtn = screen.getByText('Prendre en photo');
    const fileBtn = screen.getByText('Choisir un fichier');
    expect(
      cameraBtn.compareDocumentPosition(fileBtn) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('shows file size error for oversized files', () => {
    renderUploadForm();
    const fileInput = document.querySelector('input[type="file"]:not([capture])') as HTMLInputElement;
    const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.pdf', { type: 'application/pdf' });
    fireEvent.change(fileInput, { target: { files: [largeFile] } });
    expect(screen.getByRole('alert')).toHaveTextContent('Le fichier est trop volumineux (max 5 Mo)');
  });

  it('shows file type error for invalid MIME type', () => {
    renderUploadForm();
    const fileInput = document.querySelector('input[type="file"]:not([capture])') as HTMLInputElement;
    const gifFile = new File(['gif'], 'image.gif', { type: 'image/gif' });
    fireEvent.change(fileInput, { target: { files: [gifFile] } });
    expect(screen.getByRole('alert')).toHaveTextContent('Type de fichier invalide');
  });

  it('submit button is disabled when no file selected', () => {
    renderUploadForm();
    const submitBtn = screen.getByRole('button', { name: /ajouter le document/i });
    expect(submitBtn).toBeDisabled();
  });

  it('submit button is disabled when no type selected', () => {
    renderUploadForm();
    const fileInput = document.querySelector('input[type="file"]:not([capture])') as HTMLInputElement;
    const file = new File(['data'], 'doc.pdf', { type: 'application/pdf' });
    fireEvent.change(fileInput, { target: { files: [file] } });
    // Type not selected yet
    const submitBtn = screen.getByRole('button', { name: /ajouter le document/i });
    expect(submitBtn).toBeDisabled();
  });

  it('preselects dog when preselectedDogId is provided', () => {
    const dogs = [
      { id: 'dog-1', name: 'Rex' },
      { id: 'dog-2', name: 'Bella' },
    ];
    renderUploadForm({ dogs, preselectedDogId: 'dog-2' });
    const select = screen.getByLabelText('Associer à') as HTMLSelectElement;
    expect(select.value).toBe('dog-2');
  });

  it('preserves form state on error (form remains visible)', async () => {
    const mutateMock = jest.fn((_args: unknown, { onError }: { onError: () => void }) => {
      onError();
    });
    mockUseUploadDocument.mockReturnValue({ mutate: mutateMock, isPending: false });

    renderUploadForm();

    // Select a valid file
    const fileInput = document.querySelector('input[type="file"]:not([capture])') as HTMLInputElement;
    const file = new File(['data'], 'doc.pdf', { type: 'application/pdf' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Select a type
    fireEvent.change(screen.getByLabelText('Type de document *'), {
      target: { value: DocumentType.LICENSE },
    });

    // Submit
    fireEvent.submit(screen.getByRole('form', { hidden: true }));

    // Toast error shown
    expect(mockToast.error).toHaveBeenCalledWith(
      expect.stringContaining("Nous n'avons pas pu télécharger ce fichier"),
    );

    // Form is still visible (state preserved)
    expect(screen.getByText('Ajouter le document')).toBeInTheDocument();
  });

  it('shows all required French document type labels', () => {
    renderUploadForm();
    const select = screen.getByLabelText('Type de document *');
    fireEvent.click(select);
    expect(screen.getByText("Formulaire d'inscription")).toBeInTheDocument();
    expect(screen.getByText('Certificat de vaccination')).toBeInTheDocument();
    expect(screen.getByText('Carnet de santé')).toBeInTheDocument();
    expect(screen.getByText('Licence')).toBeInTheDocument();
    expect(screen.getByText('Autre')).toBeInTheDocument();
  });
});
