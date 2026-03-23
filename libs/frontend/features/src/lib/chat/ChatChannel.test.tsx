import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock sub-components
vi.mock('./ChatBubble', () => ({
  ChatBubble: ({ message }: any) => <div data-testid="chat-bubble">{message.content}</div>,
}));

vi.mock('./ReconnectingBanner', () => ({
  ReconnectingBanner: ({ isReconnecting }: any) =>
    isReconnecting ? <div data-testid="reconnecting-banner">Reconnexion...</div> : null,
}));

// Mock hooks
vi.mock('./hooks/useChatHistory', () => ({
  useChatHistory: vi.fn(),
  useScrollSentinel: vi.fn(() => ({ current: null })),
  useChatHistorySocketSync: vi.fn(() => ({ addMessage: vi.fn() })),
}));

vi.mock('./hooks/useChat', () => ({
  useSendMessage: vi.fn(),
  useChatConnectionState: vi.fn(() => ({ isConnected: true, isReconnecting: false })),
  usePendingQueue: vi.fn(() => ({ pendingMessages: [], sendMessage: vi.fn() })),
  useMissedMessages: vi.fn(),
}));

vi.mock('./hooks/useChatImage', () => ({
  useUploadChatImage: vi.fn(() => ({
    uploadImage: vi.fn(),
    retryUpload: vi.fn(),
    pendingUploads: [],
  })),
}));

vi.mock('@org/data-access', () => ({
  useAuth: vi.fn(),
  chatSocket: { onMessage: vi.fn(() => () => {}), connect: vi.fn() },
}));

vi.mock('@org/ui', () => ({
  SkeletonList: () => <div data-testid="skeleton" />,
  cn: (...args: string[]) => args.filter(Boolean).join(' '),
}));

import { useChatHistory } from './hooks/useChatHistory';
import { usePendingQueue, useChatConnectionState } from './hooks/useChat';
import { useAuth } from '@org/data-access';
import { ChatChannel } from './ChatChannel';

const mockUseChatHistory = vi.mocked(useChatHistory);
const mockUsePendingQueue = vi.mocked(usePendingQueue);
const mockUseChatConnectionState = vi.mocked(useChatConnectionState);
const mockUseAuth = vi.mocked(useAuth);

function renderChatChannel(channelId = 'ch-1') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/chat/${channelId}`]}>
        <Routes>
          <Route path="/chat" element={<div>Channel List</div>} />
          <Route
            path="/chat/:channelId"
            element={<ChatChannel channelId={channelId} channelName="General" />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ChatChannel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1', email: 'a@b.com', firstName: 'Alice', lastName: 'D', avatarUrl: null },
      activeClub: { id: 'club-1', name: 'Test Club' },
      accessToken: 'token',
    } as ReturnType<typeof useAuth>);
    mockUsePendingQueue.mockReturnValue({ pendingMessages: [], sendMessage: vi.fn() });
    mockUseChatConnectionState.mockReturnValue({ isConnected: true, isReconnecting: false } as any);
  });

  it('shows skeleton while loading', () => {
    mockUseChatHistory.mockReturnValue({
      data: undefined,
      isLoading: true,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    } as any);

    renderChatChannel();
    expect(screen.getByTestId('skeleton')).toBeInTheDocument();
  });

  it('shows empty state when no messages', () => {
    mockUseChatHistory.mockReturnValue({
      data: { pages: [] },
      isLoading: false,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    } as any);

    renderChatChannel();
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByText('Lancez la conversation !')).toBeInTheDocument();
  });

  it('renders messages when data is available', () => {
    mockUseChatHistory.mockReturnValue({
      data: {
        pages: [{
          data: [{
            id: 'msg-1',
            channelId: 'ch-1',
            content: 'Hello from Alice',
            userId: 'user-2',
            senderName: 'Bob Martin',
            senderAvatar: null,
            imageUrl: null,
            createdAt: '2026-01-01T12:00:00.000Z',
          }],
        }],
      },
      isLoading: false,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    } as any);

    renderChatChannel();
    expect(screen.getByText('Hello from Alice')).toBeInTheDocument();
  });

  it('shows channel name in header', () => {
    mockUseChatHistory.mockReturnValue({
      data: { pages: [] },
      isLoading: false,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    } as any);

    renderChatChannel();
    expect(screen.getByText('General')).toBeInTheDocument();
  });

  it('sends a message when input is submitted', async () => {
    const mockSendMessage = vi.fn();
    mockUsePendingQueue.mockReturnValue({ pendingMessages: [], sendMessage: mockSendMessage });
    mockUseChatHistory.mockReturnValue({
      data: { pages: [] },
      isLoading: false,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    } as any);

    renderChatChannel();

    const textarea = screen.getByRole('textbox');
    await userEvent.type(textarea, 'Test message');
    await userEvent.click(screen.getByRole('button', { name: /envoyer/i }));

    expect(mockSendMessage).toHaveBeenCalledWith('Test message');
  });

  it('shows reconnecting banner when isReconnecting is true', () => {
    mockUseChatConnectionState.mockReturnValue({ isConnected: false, isReconnecting: true } as any);
    mockUseChatHistory.mockReturnValue({
      data: { pages: [] },
      isLoading: false,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    } as any);

    renderChatChannel();
    expect(screen.getByTestId('reconnecting-banner')).toBeInTheDocument();
  });

  it('does not show banner when connected', () => {
    mockUseChatHistory.mockReturnValue({
      data: { pages: [] },
      isLoading: false,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    } as any);

    renderChatChannel();
    expect(screen.queryByTestId('reconnecting-banner')).toBeNull();
  });
});
