import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@org/data-access';
import type { ChatMessage } from '@org/types';

export interface LocalChatMessage extends ChatMessage {
  status?: 'uploading' | 'failed';
  localObjectUrl?: string;
  localFile?: File;
}

interface UploadImageResponse {
  data: ChatMessage;
}

const API_BASE_URL =
  typeof import.meta !== 'undefined' && (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL
    ? (import.meta as { env?: { VITE_API_URL?: string } }).env!.VITE_API_URL!
    : '/api';

export function useUploadChatImage(channelId: string) {
  const { activeClub, user, accessToken } = useAuth();
  const clubId = activeClub?.id ?? '';
  const queryClient = useQueryClient();
  const [pendingUploads, setPendingUploads] = useState<LocalChatMessage[]>([]);

  const uploadImage = useCallback(
    async (file: File) => {
      const objectUrl = URL.createObjectURL(file);
      const tempId = `local-${Date.now()}`;

      const optimisticMsg: LocalChatMessage = {
        id: tempId,
        channelId,
        content: '',
        imageUrl: objectUrl,
        userId: user?.id ?? '',
        senderName: user ? `${user.firstName} ${user.lastName}` : '',
        senderAvatar: user?.avatarUrl ?? null,
        createdAt: new Date().toISOString(),
        status: 'uploading',
        localObjectUrl: objectUrl,
        localFile: file,
      };

      setPendingUploads((prev) => [...prev, optimisticMsg]);

      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(
          `${API_BASE_URL}/channels/${channelId}/messages/image`,
          {
            method: 'POST',
            headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
            credentials: 'include',
            body: formData,
          },
        );

        if (!response.ok) {
          throw new Error(`Upload failed: ${response.status}`);
        }

        const body = (await response.json()) as UploadImageResponse;
        const serverMessage = body.data ?? (body as unknown as ChatMessage);

        // Remove optimistic message — socket will deliver the real one,
        // but as fallback also update the simple messages cache
        setPendingUploads((prev) => prev.filter((m) => m.id !== tempId));
        URL.revokeObjectURL(objectUrl);

        // Inject into simple messages cache as fallback (in case socket is slow)
        queryClient.setQueryData<{ data: ChatMessage[] }>(
          ['messages', clubId, channelId],
          (old) => {
            if (!old) return { data: [serverMessage] };
            const exists = old.data.some((m) => m.id === serverMessage.id);
            if (exists) return old;
            return { data: [...old.data, serverMessage] };
          },
        );
      } catch {
        setPendingUploads((prev) =>
          prev.map((m) =>
            m.id === tempId ? { ...m, status: 'failed' as const } : m,
          ),
        );
      }
    },
    [channelId, clubId, user, accessToken, queryClient],
  );

  const retryUpload = useCallback(
    (localId: string) => {
      const msg = pendingUploads.find((m) => m.id === localId);
      if (!msg?.localFile) return;

      // Reset to uploading
      setPendingUploads((prev) =>
        prev.map((m) =>
          m.id === localId ? { ...m, status: 'uploading' as const } : m,
        ),
      );

      const file = msg.localFile;
      uploadImage(file).then(() => {
        // Remove the old pending entry (uploadImage adds a new optimistic entry)
        setPendingUploads((prev) => prev.filter((m) => m.id !== localId));
      });
    },
    [pendingUploads, uploadImage],
  );

  return { uploadImage, retryUpload, pendingUploads };
}
