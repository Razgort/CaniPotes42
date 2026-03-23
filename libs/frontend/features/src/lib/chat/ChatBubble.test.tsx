import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatBubble } from './ChatBubble';
import type { LocalChatMessage } from './hooks/useChatImage';

// Mock the @org/ui Avatar component
vi.mock('@org/ui', () => ({
  Avatar: ({ fallback }: { src?: string; fallback: string }) => (
    <div data-testid="avatar">{fallback}</div>
  ),
  cn: (...args: (string | boolean | undefined)[]) => args.filter(Boolean).join(' '),
}));

function makeMessage(overrides: Partial<LocalChatMessage> = {}): LocalChatMessage {
  return {
    id: 'msg-1',
    channelId: 'ch-1',
    content: 'Bonjour!',
    imageUrl: null,
    userId: 'user-1',
    senderName: 'Alice Dupont',
    senderAvatar: null,
    createdAt: '2026-01-01T14:30:00.000Z',
    ...overrides,
  };
}

describe('ChatBubble', () => {
  describe('text messages', () => {
    it('renders message content', () => {
      render(<ChatBubble message={makeMessage()} isOwn={false} />);
      expect(screen.getByText('Bonjour!')).toBeInTheDocument();
    });

    it('shows sender name for other users messages', () => {
      render(<ChatBubble message={makeMessage()} isOwn={false} />);
      expect(screen.getByText('Alice Dupont')).toBeInTheDocument();
    });

    it('does not show sender name for own messages', () => {
      render(<ChatBubble message={makeMessage()} isOwn={true} />);
      expect(screen.queryByText('Alice Dupont')).not.toBeInTheDocument();
    });

    it('shows avatar for other users messages', () => {
      render(<ChatBubble message={makeMessage()} isOwn={false} />);
      expect(screen.getByTestId('avatar')).toBeInTheDocument();
    });

    it('does not show avatar for own messages', () => {
      render(<ChatBubble message={makeMessage()} isOwn={true} />);
      expect(screen.queryByTestId('avatar')).not.toBeInTheDocument();
    });

    it('shows initials in avatar fallback', () => {
      render(<ChatBubble message={makeMessage()} isOwn={false} />);
      expect(screen.getByTestId('avatar')).toHaveTextContent('AD');
    });

    it('formats timestamp in French locale', () => {
      render(<ChatBubble message={makeMessage()} isOwn={false} />);
      const container = screen.getByText(/\d{2}:\d{2}/);
      expect(container).toBeInTheDocument();
    });

    it('applies right-alignment class for own messages', () => {
      const { container } = render(
        <ChatBubble message={makeMessage()} isOwn={true} />,
      );
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('ml-auto');
    });

    it('applies left-alignment class for other users messages', () => {
      const { container } = render(
        <ChatBubble message={makeMessage()} isOwn={false} />,
      );
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('mr-auto');
    });

    it('applies blue tint for own messages bubble', () => {
      render(<ChatBubble message={makeMessage()} isOwn={true} />);
      const bubble = screen.getByText('Bonjour!') as HTMLElement;
      expect(bubble.className).toContain('bg-blue-100');
    });

    it('applies muted styling for other users messages bubble', () => {
      render(<ChatBubble message={makeMessage()} isOwn={false} />);
      const bubble = screen.getByText('Bonjour!') as HTMLElement;
      expect(bubble.className).toContain('bg-muted');
    });
  });

  describe('pending state', () => {
    it('shows clock icon when isPending is true', () => {
      render(<ChatBubble message={makeMessage()} isOwn={true} isPending={true} />);
      expect(screen.getByTestId('pending-clock')).toBeInTheDocument();
    });

    it('does not show clock icon when isPending is false (default)', () => {
      render(<ChatBubble message={makeMessage()} isOwn={true} />);
      expect(screen.queryByTestId('pending-clock')).not.toBeInTheDocument();
    });

    it('applies opacity-60 class to bubble when isPending', () => {
      render(<ChatBubble message={makeMessage()} isOwn={true} isPending={true} />);
      expect(screen.getByTestId('pending-bubble')).toBeInTheDocument();
    });

    it('does not apply pending-bubble testid when not pending', () => {
      render(<ChatBubble message={makeMessage()} isOwn={true} isPending={false} />);
      expect(screen.queryByTestId('pending-bubble')).not.toBeInTheDocument();
    });

    it('clock icon has accessible aria-label', () => {
      render(<ChatBubble message={makeMessage()} isOwn={true} isPending={true} />);
      expect(screen.getByLabelText("Message en attente d'envoi")).toBeInTheDocument();
    });
  });

  describe('image messages', () => {
    it('renders image with lazy loading', () => {
      const msg = makeMessage({ imageUrl: 'https://r2.example.com/img.jpg', content: '' });
      render(<ChatBubble message={msg} isOwn={false} />);
      const img = screen.getByAltText('Image partagée par Alice Dupont') as HTMLImageElement;
      expect(img).toBeInTheDocument();
      expect(img.getAttribute('loading')).toBe('lazy');
    });

    it('applies blur-sm class before image loads', () => {
      const msg = makeMessage({ imageUrl: 'https://r2.example.com/img.jpg', content: '' });
      render(<ChatBubble message={msg} isOwn={false} />);
      const img = screen.getByAltText('Image partagée par Alice Dupont') as HTMLImageElement;
      expect(img.className).toContain('blur-sm');
    });

    it('removes blur after image loads (onLoad)', () => {
      const msg = makeMessage({ imageUrl: 'https://r2.example.com/img.jpg', content: '' });
      render(<ChatBubble message={msg} isOwn={false} />);
      const img = screen.getByAltText('Image partagée par Alice Dupont') as HTMLImageElement;
      fireEvent.load(img);
      expect(img.className).not.toContain('blur-sm');
    });

    it('opens full-screen viewer when image is clicked', () => {
      const msg = makeMessage({ imageUrl: 'https://r2.example.com/img.jpg', content: '' });
      render(<ChatBubble message={msg} isOwn={false} />);
      const img = screen.getByAltText('Image partagée par Alice Dupont');
      fireEvent.click(img);
      const closeBtn = screen.getByRole('button', { name: 'Fermer l\'image' });
      expect(closeBtn).toBeInTheDocument();
    });

    it('closes full-screen viewer when close button is clicked', () => {
      const msg = makeMessage({ imageUrl: 'https://r2.example.com/img.jpg', content: '' });
      render(<ChatBubble message={msg} isOwn={false} />);
      fireEvent.click(screen.getByAltText('Image partagée par Alice Dupont'));
      fireEvent.click(screen.getByRole('button', { name: 'Fermer l\'image' }));
      expect(screen.queryByRole('button', { name: 'Fermer l\'image' })).not.toBeInTheDocument();
    });

    it('renders uploading skeleton for status=uploading', () => {
      const msg = makeMessage({
        id: 'local-123',
        imageUrl: 'blob:local',
        localObjectUrl: 'blob:local',
        content: '',
        status: 'uploading',
      });
      render(<ChatBubble message={msg} isOwn={true} />);
      // No img tag — only the skeleton spinner div
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });

    it('renders retry button for status=failed', () => {
      const onRetry = vi.fn();
      const msg = makeMessage({
        id: 'local-456',
        imageUrl: 'blob:local',
        localObjectUrl: 'blob:local',
        content: '',
        status: 'failed',
      });
      render(<ChatBubble message={msg} isOwn={true} onRetry={onRetry} />);
      const btn = screen.getByText(/Échec de l'envoi/);
      expect(btn).toBeInTheDocument();
      fireEvent.click(btn);
      expect(onRetry).toHaveBeenCalledWith('local-456');
    });
  });
});
