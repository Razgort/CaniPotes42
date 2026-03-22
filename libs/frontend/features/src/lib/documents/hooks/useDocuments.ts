import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, ApiClientError } from '@org/data-access';
import { DocumentType } from '@org/types';

export type ExpiryStatus = 'valid' | 'expiring' | 'expired';

export interface DocumentDto {
  id: string;
  type: DocumentType;
  fileName: string;
  fileUrl: string;
  expiryDate: string | null;
  expiryStatus: ExpiryStatus | null;
  dogId: string | null;
  dogName: string | null;
  dog: { id: string; name: string } | null;
  user: { id: string; firstName: string; lastName: string } | null;
  memberName?: string;
  createdAt: string;
}

interface DocumentsListResponse {
  data: DocumentDto[];
  meta: { total: number; page: number; pageSize: number };
}

interface SingleDocumentResponse {
  data: DocumentDto;
}

interface DownloadUrlResponse {
  data: { url: string };
}

interface UseDocumentsOptions {
  dogId?: string;
  type?: DocumentType;
  page?: number;
  pageSize?: number;
  search?: string;
  status?: ExpiryStatus;
}

export function useDocuments(clubId: string | null, options: UseDocumentsOptions = {}) {
  const params = new URLSearchParams();
  if (options.dogId) params.set('dogId', options.dogId);
  if (options.type) params.set('type', options.type);
  if (options.search) params.set('search', options.search);
  if (options.status) params.set('status', options.status);
  if (options.page) params.set('page', String(options.page));
  if (options.pageSize) params.set('pageSize', String(options.pageSize));

  const queryString = params.toString();
  const endpoint = `/documents${queryString ? `?${queryString}` : ''}`;

  return useQuery<DocumentsListResponse, ApiClientError>({
    queryKey: ['documents', clubId, options],
    queryFn: () => apiClient.get<DocumentsListResponse>(endpoint),
    enabled: !!clubId,
  });
}

export function useDocumentDetail(clubId: string | null, documentId: string | undefined) {
  return useQuery<SingleDocumentResponse, ApiClientError>({
    queryKey: ['documents', clubId, documentId],
    queryFn: () => apiClient.get<SingleDocumentResponse>(`/documents/${documentId}`),
    enabled: !!clubId && !!documentId,
  });
}

export function useDocumentDownloadUrl(clubId: string | null, documentId: string | undefined) {
  return useQuery<DownloadUrlResponse, ApiClientError>({
    queryKey: ['documents', clubId, documentId, 'download'],
    queryFn: () => apiClient.get<DownloadUrlResponse>(`/documents/${documentId}/download`),
    enabled: !!clubId && !!documentId,
    staleTime: 50 * 60 * 1000, // 50 min — URL valid for 60 min
  });
}

export interface UploadDocumentInput {
  file: File;
  type: DocumentType;
  expiryDate?: string;
  dogId?: string;
  onProgress?: (percent: number) => void;
}

export function useUploadDocument(clubId: string | null) {
  const queryClient = useQueryClient();

  return useMutation<SingleDocumentResponse, ApiClientError, UploadDocumentInput>({
    mutationFn: ({ file, type, expiryDate, dogId, onProgress }) => {
      return new Promise<SingleDocumentResponse>((resolve, reject) => {
        const params = new URLSearchParams({ type });
        if (expiryDate) params.set('expiryDate', expiryDate);
        if (dogId) params.set('dogId', dogId);

        const formData = new FormData();
        formData.append('file', file);

        const API_BASE_URL =
          typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL
            ? import.meta.env.VITE_API_URL
            : '/api';

        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${API_BASE_URL}/documents?${params.toString()}`);

        const token = localStorage.getItem('accessToken');
        if (token) {
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }
        xhr.withCredentials = true;

        if (onProgress) {
          xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
              onProgress(Math.round((e.loaded / e.total) * 100));
            }
          });
        }

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve(JSON.parse(xhr.responseText) as SingleDocumentResponse);
            } catch {
              reject(new ApiClientError(500, 'PARSE_ERROR', 'Réponse invalide du serveur'));
            }
          } else {
            let errBody: { error?: string; message?: string } = {};
            try {
              errBody = JSON.parse(xhr.responseText);
            } catch {
              // not JSON
            }
            reject(
              new ApiClientError(
                xhr.status,
                errBody.error ?? 'UPLOAD_ERROR',
                errBody.message ?? "Nous n'avons pas pu télécharger ce fichier — réessayez",
              ),
            );
          }
        };

        xhr.onerror = () => {
          reject(
            new ApiClientError(0, 'NETWORK_ERROR', "Nous n'avons pas pu télécharger ce fichier — réessayez"),
          );
        };

        xhr.send(formData);
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', clubId] });
    },
  });
}

export function useDeleteDocument(clubId: string | null) {
  const queryClient = useQueryClient();

  return useMutation<void, ApiClientError, { documentId: string }>({
    mutationFn: ({ documentId }) =>
      apiClient.delete<void>(`/documents/${documentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', clubId] });
    },
  });
}
