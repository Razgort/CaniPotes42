import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { SkeletonList, cn } from '@org/ui';
import { useAuth } from '@org/data-access';
import { ChatBubble } from './ChatBubble';
import { ChatInput } from './ChatInput';
import {
  useMessages,
  useSendMessage,
  useChatSocket,
} from './hooks/useChat';

interface ChatChannelProps {
  channelId: string;
  channelName?: string;
}

export function ChatChannel({ channelId, channelName = 'Canal' }: ChatChannelProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);

  const { data, isLoading } = useMessages(channelId);
  const { sendMessage } = useSendMessage();
  useChatSocket(channelId);

  const messages = data?.data ?? [];

  // Track if user is scrolled to bottom
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    isAtBottomRef.current = scrollHeight - scrollTop - clientHeight < 50;
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (isAtBottomRef.current && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  // Scroll to bottom on initial load
  useEffect(() => {
    if (!isLoading && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView();
    }
  }, [isLoading]);

  const handleSend = useCallback(
    (content: string) => {
      sendMessage(channelId, content);
    },
    [channelId, sendMessage],
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
          className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted transition-colors"
          aria-label="Retour aux canaux"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="text-sm font-semibold">{channelName}</h1>
      </div>

      {/* Messages */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4"
      >
        {messages.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
            <span className="text-2xl">💬</span>
            <p
              className={cn(
                'text-sm font-medium text-muted-foreground',
              )}
              data-testid="empty-state"
            >
              Lancez la conversation !
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <ChatBubble
              key={message.id}
              content={message.content}
              senderName={message.senderName}
              senderAvatar={message.senderAvatar}
              createdAt={message.createdAt}
              isOwn={message.userId === user?.id}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <ChatInput onSend={handleSend} />
    </div>
  );
}
