import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChatBubble } from './ChatBubble';

// Mock the @org/ui Avatar component
vi.mock('@org/ui', () => ({
  Avatar: ({ fallback }: { src?: string; fallback: string }) => (
    <div data-testid="avatar">{fallback}</div>
  ),
  cn: (...args: string[]) => args.filter(Boolean).join(' '),
}));

const baseProps = {
  content: 'Bonjour!',
  senderName: 'Alice Dupont',
  senderAvatar: null,
  createdAt: '2026-01-01T14:30:00.000Z',
  isOwn: false,
};

describe('ChatBubble', () => {
  it('renders message content', () => {
    render(<ChatBubble {...baseProps} />);
    expect(screen.getByText('Bonjour!')).toBeInTheDocument();
  });

  it('shows sender name for other users messages', () => {
    render(<ChatBubble {...baseProps} isOwn={false} />);
    expect(screen.getByText('Alice Dupont')).toBeInTheDocument();
  });

  it('does not show sender name for own messages', () => {
    render(<ChatBubble {...baseProps} isOwn={true} />);
    expect(screen.queryByText('Alice Dupont')).not.toBeInTheDocument();
  });

  it('shows avatar for other users messages', () => {
    render(<ChatBubble {...baseProps} isOwn={false} />);
    expect(screen.getByTestId('avatar')).toBeInTheDocument();
  });

  it('does not show avatar for own messages', () => {
    render(<ChatBubble {...baseProps} isOwn={true} />);
    expect(screen.queryByTestId('avatar')).not.toBeInTheDocument();
  });

  it('shows initials in avatar fallback', () => {
    render(<ChatBubble {...baseProps} isOwn={false} />);
    expect(screen.getByTestId('avatar')).toHaveTextContent('AD');
  });

  it('formats timestamp in French locale', () => {
    render(<ChatBubble {...baseProps} createdAt="2026-01-01T14:30:00.000Z" />);
    // Should contain formatted time — the exact format depends on the locale
    const container = screen.getByText(/\d{2}:\d{2}/);
    expect(container).toBeInTheDocument();
  });

  it('applies right-alignment class for own messages', () => {
    const { container } = render(<ChatBubble {...baseProps} isOwn={true} />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('ml-auto');
  });

  it('applies left-alignment class for other users messages', () => {
    const { container } = render(<ChatBubble {...baseProps} isOwn={false} />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('mr-auto');
  });

  it('applies blue tint for own messages bubble', () => {
    render(<ChatBubble {...baseProps} isOwn={true} />);
    const bubble = screen.getByText('Bonjour!') as HTMLElement;
    expect(bubble.className).toContain('bg-blue-100');
  });

  it('applies muted styling for other users messages bubble', () => {
    render(<ChatBubble {...baseProps} isOwn={false} />);
    const bubble = screen.getByText('Bonjour!') as HTMLElement;
    expect(bubble.className).toContain('bg-muted');
  });
});
