import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { SkeletonList, cn } from '@org/ui';
import { useAuth } from '@org/data-access';
import { chatSocket } from '@org/data-access';
import { ChatBubble } from './ChatBubble';
import { ChatInput } from './ChatInput';
import { ReconnectingBanner } from './ReconnectingBanner';
import {
  useChatConnectionState,
  usePendingQueue,
  useMissedMessages,
} from './hooks/useChat';
import {
  useChatHistory,
  useScrollSentinel,
  useChatHistorySocketSync,
} from './hooks/useChatHistory';
import { useUploadChatImage } from './hooks/useChatImage';
import type { LocalChatMessage } from './hooks/useChatImage';
import type { ChatMessage } from '@org/types';

interface ChatChannelProps {
  channelId: string;
  channelName?: string;
}

function ChatSkeleton() {
  return (
    <div className="flex flex-col gap-3 px-4 py-2">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className={cn(
            'flex gap-2',
            i % 2 === 0 ? 'ml-auto flex-row-reverse' : 'mr-auto flex-row',
          )}
        >
          <div className="h-8 w-8 flex-shrink-0 rounded-full bg-muted animate-pulse" />
          <div className="h-10 w-48 rounded-2xl bg-muted animate-pulse" />
        </div>
      ))}
    </div>
  );
}

export function ChatChannel({ channelId, channelName = 'Canal' }: ChatChannelProps) {
  const { user, activeClub, accessToken } = useAuth();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const prevScrollHeightRef = useRef(0);

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useChatHistory(channelId);

  const { addMessage } = useChatHistorySocketSync(channelId);
  const { uploadImage, retryUpload, pendingUploads } = useUploadChatImage(channelId);

  // Reconnection state + reliability features (Story 8.3)
  const { isReconnecting } = useChatConnectionState();
  const { pendingMessages, sendMessage } = usePendingQueue(channelId);
  useMissedMessages(channelId, addMessage);

  // Flatten pages into ordered messages (oldest first)
  const historyMessages: LocalChatMessage[] = (data?.pages ?? [])
    .flatMap((page) => page.data)
    .map((m) => m as LocalChatMessage);

  const allMessages: LocalChatMessage[] = [...historyMessages, ...pendingUploads];

  // Connect socket
  useEffect(() => {
    if (!accessToken || !activeClub?.id) return;
    chatSocket.connect(accessToken, activeClub.id);
  }, [accessToken, activeClub?.id]);

  // Subscribe to incoming messages
  useEffect(() => {
    if (!channelId) return;

    const unsubscribe = chatSocket.onMessage((message: ChatMessage) => {
      if (message.channelId !== channelId) return;
      addMessage(message);

      // Auto-scroll if user was at bottom
      if (isAtBottomRef.current && messagesEndRef.current) {
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 50);
      }
    });

    return unsubscribe;
  }, [channelId, addMessage]);

  // Scroll sentinel for infinite scroll (top of list)
  const sentinelRef = useScrollSentinel(hasNextPage, () => {
    // Save scroll height before fetching older messages
    if (containerRef.current) {
      prevScrollHeightRef.current = containerRef.current.scrollHeight;
    }
    fetchNextPage();
  }, isFetchingNextPage);

  // Restore scroll position after loading older messages
  useEffect(() => {
    if (containerRef.current && prevScrollHeightRef.current > 0) {
      containerRef.current.scrollTop =
        containerRef.current.scrollHeight - prevScrollHeightRef.current;
      prevScrollHeightRef.current = 0;
    }
  }, [data]);

  // Scroll to bottom on initial load
  useEffect(() => {
    if (!isLoading && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView();
    }
  }, [isLoading]);

  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    isAtBottomRef.current = scrollHeight - scrollTop - clientHeight < 50;
  }, []);

  const handleSend = useCallback(
    (content: string) => {
      sendMessage(content);
    },
    [sendMessage],
  );

  if (isLoading) {
    return (
      <div className="flex h-full flex-col">
        <SkeletonList />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col pb-0">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border bg-card px-4 py-3">
        <button
          type="button"
          onClick={() => navigate('/chat')}
          className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted transition-colors lg:hidden"
          aria-label="Retour aux canaux"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="text-sm font-semibold">{channelName}</h1>
      </div>

      {/* Reconnecting banner (Story 8.3) */}
      <ReconnectingBanner isReconnecting={isReconnecting} />

      {/* Messages */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4"
      >
        {/* Top sentinel for infinite scroll */}
        <div ref={sentinelRef} />

        {isFetchingNextPage && <ChatSkeleton />}

        {allMessages.length === 0 && pendingMessages.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
            <span className="text-2xl">💬</span>
            <p
              className={cn('text-sm font-medium text-muted-foreground')}
              data-testid="empty-state"
            >
              Lancez la conversation !
            </p>
          </div>
        ) : (
          <>
            {allMessages.map((message) => (
              <ChatBubble
                key={message.id}
                message={message}
                isOwn={message.userId === user?.id}
                onRetry={retryUpload}
              />
            ))}
            {/* Pending offline messages (Story 8.3) */}
            {pendingMessages.map((pending) => (
              <ChatBubble
                key={pending.id}
                message={{
                  id: pending.id,
                  channelId: pending.channelId,
                  content: pending.content,
                  imageUrl: null,
                  userId: user?.id ?? '',
                  senderName: user ? `${user.firstName} ${user.lastName}` : '',
                  senderAvatar: user?.avatarUrl ?? null,
                  createdAt: pending.queuedAt.toISOString(),
                }}
                isOwn={true}
                isPending={true}
              />
            ))}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <ChatInput
        onSend={handleSend}
        onImageSelect={uploadImage}
      />
    </div>
  );
}
