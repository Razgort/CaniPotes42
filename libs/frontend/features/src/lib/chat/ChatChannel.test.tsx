import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// Mock hooks
vi.mock('./hooks/useChat', () => ({
  useMessages: vi.fn(),
  useSendMessage: vi.fn(),
  useChatSocket: vi.fn(),
}));

vi.mock('@org/data-access', () => ({
  useAuth: vi.fn(),
  chatSocket: { onMessage: vi.fn(() => () => {}), connect: vi.fn() },
}));

vi.mock('@org/ui', () => ({
  SkeletonList: () => <div data-testid="skeleton" />,
  cn: (...args: string[]) => args.filter(Boolean).join(' '),
  Avatar: ({ fallback }: { fallback: string }) => <div>{fallback}</div>,
}));

import { useMessages, useSendMessage, useChatSocket } from './hooks/useChat';
import { useAuth } from '@org/data-access';
import { ChatChannel } from './ChatChannel';

const mockUseMessages = vi.mocked(useMessages);
const mockUseSendMessage = vi.mocked(useSendMessage);
const mockUseChatSocket = vi.mocked(useChatSocket);
const mockUseAuth = vi.mocked(useAuth);

function renderChatChannel(channelId = 'ch-1') {
  return render(
    <MemoryRouter initialEntries={[`/chat/${channelId}`]}>
      <Routes>
        <Route path="/chat" element={<div>Channel List</div>} />
        <Route
          path="/chat/:channelId"
          element={<ChatChannel channelId={channelId} channelName="General" />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ChatChannel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // JSDOM does not implement scrollIntoView
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1', email: 'a@b.com', firstName: 'Alice', lastName: 'D' },
      activeClub: { id: 'club-1', name: 'Test Club' },
      accessToken: 'token',
    } as ReturnType<typeof useAuth>);
    mockUseSendMessage.mockReturnValue({ sendMessage: vi.fn() });
    mockUseChatSocket.mockReturnValue(undefined);
  });

  it('shows skeleton while loading', () => {
    mockUseMessages.mockReturnValue({
      data: undefined,
      isLoading: true,
    } as ReturnType<typeof useMessages>);

    renderChatChannel();
    expect(screen.getByTestId('skeleton')).toBeInTheDocument();
  });

  it('shows empty state when no messages', () => {
    mockUseMessages.mockReturnValue({
      data: { data: [] },
      isLoading: false,
    } as ReturnType<typeof useMessages>);

    renderChatChannel();
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByText('Lancez la conversation !')).toBeInTheDocument();
  });

  it('renders messages when data is available', () => {
    mockUseMessages.mockReturnValue({
      data: {
        data: [
          {
            id: 'msg-1',
            channelId: 'ch-1',
            content: 'Hello from Alice',
            userId: 'user-2',
            senderName: 'Bob Martin',
            senderAvatar: null,
            createdAt: '2026-01-01T12:00:00.000Z',
          },
        ],
      },
      isLoading: false,
    } as ReturnType<typeof useMessages>);

    renderChatChannel();
    expect(screen.getByText('Hello from Alice')).toBeInTheDocument();
  });

  it('shows channel name in header', () => {
    mockUseMessages.mockReturnValue({
      data: { data: [] },
      isLoading: false,
    } as ReturnType<typeof useMessages>);

    renderChatChannel();
    expect(screen.getByText('General')).toBeInTheDocument();
  });

  it('sends a message when input is submitted', async () => {
    const mockSendMessage = vi.fn();
    mockUseSendMessage.mockReturnValue({ sendMessage: mockSendMessage });
    mockUseMessages.mockReturnValue({
      data: { data: [] },
      isLoading: false,
    } as ReturnType<typeof useMessages>);

    renderChatChannel();

    const textarea = screen.getByRole('textbox');
    await userEvent.type(textarea, 'Test message');
    await userEvent.click(screen.getByRole('button', { name: /envoyer/i }));

    expect(mockSendMessage).toHaveBeenCalledWith('ch-1', 'Test message');
  });
});
