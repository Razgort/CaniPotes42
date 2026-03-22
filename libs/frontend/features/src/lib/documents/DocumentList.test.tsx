import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DocumentType } from '@org/types';
import type { DocumentDto } from './hooks/useDocuments';

// Mocks
const mockUseDocuments = vi.fn();
const mockUseDeleteDocument = vi.fn();
const mockToast = { success: vi.fn(), error: vi.fn() };

vi.mock('./hooks/useDocuments', () => ({
  useDocuments: (...args: unknown[]) => mockUseDocuments(...args),
  useDeleteDocument: (...args: unknown[]) => mockUseDeleteDocument(...args),
}));

vi.mock('@org/ui', () => ({
  toast: { success: (...a: unknown[]) => mockToast.success(...a), error: (...a: unknown[]) => mockToast.error(...a) },
  cn: (...classes: unknown[]) => classes.filter(Boolean).join(' '),
}));

import { DocumentList } from './DocumentList';

const USER_ID = 'user-uuid-123';
const CLUB_ID = 'club-uuid-456';

function buildDoc(overrides: Partial<DocumentDto> = {}): DocumentDto {
  return {
    id: 'doc-1',
    type: DocumentType.LICENSE,
    fileName: 'license.pdf',
    fileUrl: 'https://signed.url/license.pdf',
    expiryDate: null,
    dogId: null,
    dog: null,
    user: { id: USER_ID, firstName: 'Jean', lastName: 'Dupont' },
    createdAt: new Date('2026-03-22T10:00:00Z').toISOString(),
    ...overrides,
  };
}

function renderDocumentList(props: Partial<React.ComponentProps<typeof DocumentList>> = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <DocumentList
        clubId={CLUB_ID}
        userId={USER_ID}
        role="MEMBER"
        {...props}
      />
    </QueryClientProvider>,
  );
}

describe('DocumentList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDeleteDocument.mockReturnValue({ mutate: jest.fn(), isPending: false });
  });

  describe('loading state', () => {
    it('renders skeleton rows while loading', () => {
      mockUseDocuments.mockReturnValue({ data: undefined, isLoading: true });
      renderDocumentList();
      // 3 skeleton rows expected
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBe(3);
    });
  });

  describe('empty state', () => {
    it('shows empty state message when no documents', () => {
      mockUseDocuments.mockReturnValue({
        data: { data: [], meta: { total: 0, page: 1, pageSize: 20 } },
        isLoading: false,
      });
      renderDocumentList();
      expect(screen.getByText('Aucun document')).toBeInTheDocument();
      expect(screen.getByText(/Ajoutez votre premier document/i)).toBeInTheDocument();
    });

    it('shows upload CTA button in empty state when handler provided', () => {
      mockUseDocuments.mockReturnValue({
        data: { data: [], meta: { total: 0, page: 1, pageSize: 20 } },
        isLoading: false,
      });
      const onUploadClick = jest.fn();
      renderDocumentList({ onUploadClick });
      expect(screen.getByRole('button', { name: /ajouter un document/i })).toBeInTheDocument();
    });
  });

  describe('expiry badge logic', () => {
    it('shows no expiry badge when expiryDate is null', () => {
      mockUseDocuments.mockReturnValue({
        data: { data: [buildDoc({ expiryDate: null })], meta: { total: 1, page: 1, pageSize: 20 } },
        isLoading: false,
      });
      renderDocumentList();
      expect(screen.queryByText('Expiré')).not.toBeInTheDocument();
      expect(screen.queryByText('Expire bientôt')).not.toBeInTheDocument();
    });

    it('shows no badge when expiry is more than 30 days away', () => {
      const future = new Date();
      future.setDate(future.getDate() + 60);
      mockUseDocuments.mockReturnValue({
        data: { data: [buildDoc({ expiryDate: future.toISOString() })], meta: { total: 1, page: 1, pageSize: 20 } },
        isLoading: false,
      });
      renderDocumentList();
      expect(screen.queryByText('Expiré')).not.toBeInTheDocument();
      expect(screen.queryByText('Expire bientôt')).not.toBeInTheDocument();
    });

    it('shows orange "Expire bientôt" badge when expiry is within 30 days', () => {
      const soon = new Date();
      soon.setDate(soon.getDate() + 15);
      mockUseDocuments.mockReturnValue({
        data: { data: [buildDoc({ expiryDate: soon.toISOString() })], meta: { total: 1, page: 1, pageSize: 20 } },
        isLoading: false,
      });
      renderDocumentList();
      expect(screen.getByText('Expire bientôt')).toBeInTheDocument();
    });

    it('shows red "Expiré" badge for past expiry date', () => {
      const past = new Date();
      past.setDate(past.getDate() - 5);
      mockUseDocuments.mockReturnValue({
        data: { data: [buildDoc({ expiryDate: past.toISOString() })], meta: { total: 1, page: 1, pageSize: 20 } },
        isLoading: false,
      });
      renderDocumentList();
      expect(screen.getByText('Expiré')).toBeInTheDocument();
    });
  });

  describe('document list rendering', () => {
    it('renders document type label in French', () => {
      mockUseDocuments.mockReturnValue({
        data: {
          data: [buildDoc({ type: DocumentType.VACCINE_CERTIFICATE })],
          meta: { total: 1, page: 1, pageSize: 20 },
        },
        isLoading: false,
      });
      renderDocumentList();
      expect(screen.getByText('Certificat de vaccination')).toBeInTheDocument();
    });

    it('renders dog association label when document associated with dog', () => {
      mockUseDocuments.mockReturnValue({
        data: {
          data: [buildDoc({ dogId: 'dog-1', dog: { id: 'dog-1', name: 'Rex' } })],
          meta: { total: 1, page: 1, pageSize: 20 },
        },
        isLoading: false,
      });
      renderDocumentList();
      expect(screen.getByText(/Chien : Rex/)).toBeInTheDocument();
    });

    it('shows "Moi" when document is not associated with a dog', () => {
      mockUseDocuments.mockReturnValue({
        data: {
          data: [buildDoc()],
          meta: { total: 1, page: 1, pageSize: 20 },
        },
        isLoading: false,
      });
      renderDocumentList();
      expect(screen.getByText('Moi')).toBeInTheDocument();
    });

    it('shows external link for viewing document', () => {
      mockUseDocuments.mockReturnValue({
        data: {
          data: [buildDoc()],
          meta: { total: 1, page: 1, pageSize: 20 },
        },
        isLoading: false,
      });
      renderDocumentList();
      const link = screen.getByRole('link', { name: /ouvrir/i });
      expect(link).toHaveAttribute('href', 'https://signed.url/license.pdf');
      expect(link).toHaveAttribute('target', '_blank');
    });
  });
});
