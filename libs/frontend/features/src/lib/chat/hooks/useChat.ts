import { useEffect, useCallback, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, chatSocket, useAuth } from '@org/data-access';
import type { ChatMessage } from '@org/types';

interface MessagesResponse {
  data: ChatMessage[];
}

// ─── PendingMessage ───────────────────────────────────────────────────────────

export interface PendingMessage {
  /** Client-generated UUID — used to match confirmation from server. */
  id: string;
  channelId: string;
  content: string;
  queuedAt: Date;
}

// ─── Channels ─────────────────────────────────────────────────────────────────

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

// ─── Messages (simple, non-paginated — kept for backward compatibility) ────────

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

// ─── Send Message (simple, for use when no offline queue needed) ───────────────

export function useSendMessage() {
  const sendViaSocket = useCallback(
    (channelId: string, content: string) => {
      chatSocket.sendMessage(channelId, content);
    },
    [],
  );

  return { sendMessage: sendViaSocket };
}

// ─── Connection State ─────────────────────────────────────────────────────────

export function useChatConnectionState() {
  const [isConnected, setIsConnected] = useState(() => chatSocket.isConnected());
  const [isReconnecting, setIsReconnecting] = useState(false);

  useEffect(() => {
    const offConnect = chatSocket.onConnect(() => {
      setIsConnected(true);
      setIsReconnecting(false);
    });
    const offDisconnect = chatSocket.onDisconnect(() => {
      setIsConnected(false);
    });
    const offReconnecting = chatSocket.onReconnecting(() => {
      setIsReconnecting(true);
    });

    return () => {
      offConnect();
      offDisconnect();
      offReconnecting();
    };
  }, []);

  return { isConnected, isReconnecting };
}

// ─── Pending Queue + Send (offline support) ───────────────────────────────────

export function usePendingQueue(channelId: string | null) {
  const [pendingMessages, setPendingMessages] = useState<PendingMessage[]>([]);

  const sendMessage = useCallback(
    (content: string) => {
      if (!channelId) return;

      if (chatSocket.isConnected()) {
        chatSocket.sendMessage(channelId, content);
      } else {
        const pending: PendingMessage = {
          id: crypto.randomUUID(),
          channelId,
          content,
          queuedAt: new Date(),
        };
        setPendingMessages((prev) => [...prev, pending]);
      }
    },
    [channelId],
  );

  // Drain queue on reconnect
  useEffect(() => {
    if (!channelId) return;

    const offConnect = chatSocket.onConnect(() => {
      setPendingMessages((prev) => {
        for (const pending of prev) {
          chatSocket.sendMessage(pending.channelId, pending.content);
        }
        return [];
      });
    });

    return offConnect;
  }, [channelId]);

  // Remove confirmed messages from pending queue
  const confirmMessage = useCallback((content: string) => {
    setPendingMessages((prev) => prev.filter((p) => p.content !== content));
  }, []);

  return { pendingMessages, sendMessage, confirmMessage };
}

// ─── Missed Messages on Reconnect ────────────────────────────────────────────

type AddMessageFn = (message: ChatMessage) => void;

export function useMissedMessages(
  channelId: string | null,
  addMessage: AddMessageFn,
) {
  const { activeClub } = useAuth();
  const clubId = activeClub?.id ?? null;
  const lastReceivedAtRef = useRef<string | null>(null);
  const queryClient = useQueryClient();

  // Update lastReceivedAt whenever new messages arrive
  useEffect(() => {
    if (!channelId) return;

    const unsubscribe = chatSocket.onMessage((message) => {
      if (message.channelId !== channelId) return;
      lastReceivedAtRef.current = message.createdAt;
    });

    return unsubscribe;
  }, [channelId]);

  // On reconnect: fetch missed messages and merge
  useEffect(() => {
    if (!channelId || !clubId) return;

    const offConnect = chatSocket.onConnect(() => {
      const since = lastReceivedAtRef.current;
      if (!since) return;

      apiClient
        .get<MessagesResponse>(
          `/channels/${channelId}/messages?since=${encodeURIComponent(since)}`,
        )
        .then((response) => {
          for (const message of response.data) {
            addMessage(message);
          }
          // Update lastReceivedAt
          const latest = response.data[response.data.length - 1];
          if (latest) {
            lastReceivedAtRef.current = latest.createdAt;
          }
        })
        .catch(() => {
          // Missed message fetch failed — new messages will arrive via WebSocket
        });
    });

    return offConnect;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId, clubId, queryClient]);
}

// ─── Socket subscription (legacy, for simple messages cache) ─────────────────

export function useChatSocket(channelId: string | null) {
  const { activeClub, accessToken } = useAuth();
  const clubId = activeClub?.id ?? null;
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!accessToken || !clubId) return;
    chatSocket.connect(accessToken, clubId);
  }, [accessToken, clubId]);

  useEffect(() => {
    if (!channelId || !clubId) return;

    const unsubscribe = chatSocket.onMessage((message) => {
      if (message.channelId !== channelId) return;

      queryClient.setQueryData<MessagesResponse>(
        ['messages', clubId, channelId],
        (old) => {
          if (!old) return { data: [message] };
          const exists = old.data.some((m) => m.id === message.id);
          if (exists) return old;
          return { data: [...old.data, message] };
        },
      );
    });

    return unsubscribe;
  }, [channelId, clubId, queryClient]);
}
