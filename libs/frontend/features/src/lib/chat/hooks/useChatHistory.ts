import { useEffect, useRef, useCallback } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, useAuth } from '@org/data-access';
import type { ChatMessage } from '@org/types';

interface MessagesPage {
  data: ChatMessage[];
  meta: { hasMore: boolean; nextCursor: string | null };
}

export function useChatHistory(channelId: string | null) {
  const { activeClub } = useAuth();
  const clubId = activeClub?.id ?? null;

  return useInfiniteQuery<MessagesPage>({
    queryKey: ['chat', clubId, channelId, 'history'],
    queryFn: ({ pageParam }) => {
      const cursor = pageParam as string | undefined;
      const url = `/channels/${channelId}/messages?limit=50${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
      return apiClient.get<MessagesPage>(url);
    },
    getNextPageParam: (lastPage) => lastPage.meta.nextCursor ?? undefined,
    initialPageParam: undefined,
    enabled: !!clubId && !!channelId,
    staleTime: 0,
  });
}

/**
 * Returns a ref callback for the "load more" sentinel element.
 * When the sentinel becomes visible and hasNextPage is true, fetchNextPage() is called.
 */
export function useScrollSentinel(
  hasNextPage: boolean | undefined,
  fetchNextPage: () => void,
  isFetchingNextPage: boolean,
) {
  const observerRef = useRef<IntersectionObserver | null>(null);

  const sentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }

      if (!node) return;

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
          }
        },
        { threshold: 0 },
      );

      observerRef.current.observe(node);
    },
    [hasNextPage, fetchNextPage, isFetchingNextPage],
  );

  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  return sentinelRef;
}

/**
 * Injects a new real-time message into the chat history infinite query cache.
 */
export function useChatHistorySocketSync(
  channelId: string | null,
) {
  const { activeClub } = useAuth();
  const clubId = activeClub?.id ?? null;
  const queryClient = useQueryClient();

  const addMessage = useCallback(
    (message: ChatMessage) => {
      if (!channelId || !clubId) return;

      queryClient.setQueryData<{ pages: MessagesPage[]; pageParams: unknown[] }>(
        ['chat', clubId, channelId, 'history'],
        (old) => {
          if (!old) {
            return {
              pages: [{ data: [message], meta: { hasMore: false, nextCursor: null } }],
              pageParams: [undefined],
            };
          }

          // Add to the last page (most recent messages)
          const lastPage = old.pages[old.pages.length - 1];
          if (!lastPage) return old;

          const exists = old.pages.some((page) =>
            page.data.some((m) => m.id === message.id),
          );
          if (exists) return old;

          const updatedLastPage: MessagesPage = {
            ...lastPage,
            data: [...lastPage.data, message],
          };

          return {
            ...old,
            pages: [...old.pages.slice(0, -1), updatedLastPage],
          };
        },
      );
    },
    [channelId, clubId, queryClient],
  );

  return { addMessage };
}
