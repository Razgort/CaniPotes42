import { useRef, useCallback, type KeyboardEvent } from 'react';
import { Send } from 'lucide-react';
import { cn } from '@org/ui';

interface ChatInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled = false }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const content = textarea.value.trim();
    if (!content) return;

    onSend(content);
    textarea.value = '';
    textarea.style.height = 'auto';
    textarea.focus();
  }, [onSend]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const handleInput = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  }, []);

  return (
    <div className="flex items-end gap-2 border-t border-border bg-card p-3">
      <textarea
        ref={textareaRef}
        rows={1}
        placeholder="Votre message..."
        disabled={disabled}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        className={cn(
          'flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2',
          'text-sm leading-relaxed placeholder:text-muted-foreground',
          'focus:outline-none focus:ring-2 focus:ring-ring',
          'max-h-[120px] overflow-y-auto',
          'disabled:opacity-50 disabled:cursor-not-allowed',
        )}
        aria-label="Saisir un message"
      />
      <button
        type="button"
        onClick={handleSend}
        disabled={disabled}
        className={cn(
          'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full',
          'bg-accent text-white hover:bg-accent/90 transition-colors',
          'disabled:opacity-50 disabled:cursor-not-allowed',
        )}
        aria-label="Envoyer le message"
      >
        <Send className="h-4 w-4" />
      </button>
    </div>
  );
}
