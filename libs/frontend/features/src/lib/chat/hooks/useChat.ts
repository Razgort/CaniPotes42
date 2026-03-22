import { useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, chatSocket, useAuth } from '@org/data-access';
import type { ChatMessage } from '@org/types';

interface MessagesResponse {
  data: ChatMessage[];
}

export function useChannels() {
  const { activeClub } = useAuth();
  const clubId = activeClub?.id ?? null;

  return useQuery<{ data: { id: string; name: string; clubId: string; createdAt: string; updatedAt: string }[] }>({
    queryKey: ['channels', clubId],
    queryFn: () =>
      apiClient.get<{ data: { id: string; name: string; clubId: string; createdAt: string; updatedAt: string }[] }>(
        '/channels',
      ),
    enabled: !!clubId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useMessages(channelId: string | null) {
  const { activeClub } = useAuth();
  const clubId = activeClub?.id ?? null;

  return useQuery<MessagesResponse>({
    queryKey: ['messages', clubId, channelId],
    queryFn: () =>
      apiClient.get<MessagesResponse>(`/channels/${channelId}/messages?limit=50`),
    enabled: !!clubId && !!channelId,
    staleTime: 0,
  });
}

export function useSendMessage() {
  const sendViaSocket = useCallback(
    (channelId: string, content: string) => {
      chatSocket.sendMessage(channelId, content);
    },
    [],
  );

  return { sendMessage: sendViaSocket };
}

export function useChatSocket(channelId: string | null) {
  const { activeClub, accessToken } = useAuth();
  const clubId = activeClub?.id ?? null;
  const queryClient = useQueryClient();

  // Connect socket when auth is available
  useEffect(() => {
    if (!accessToken || !clubId) return;

    chatSocket.connect(accessToken, clubId);

    return () => {
      // Do not disconnect on unmount — socket should persist across navigation
      // Disconnect only on logout (handled in AuthContext)
    };
  }, [accessToken, clubId]);

  // Subscribe to incoming messages for this channel
  useEffect(() => {
    if (!channelId || !clubId) return;

    const unsubscribe = chatSocket.onMessage((message) => {
      if (message.channelId !== channelId) return;

      queryClient.setQueryData<MessagesResponse>(
        ['messages', clubId, channelId],
        (old) => {
          if (!old) return { data: [message] };
          // Avoid duplicates (optimistic + real)
          const exists = old.data.some((m) => m.id === message.id);
          if (exists) return old;
          return { data: [...old.data, message] };
        },
      );
    });

    return unsubscribe;
  }, [channelId, clubId, queryClient]);
}
