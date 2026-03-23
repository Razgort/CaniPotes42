import { useRef, useCallback, type KeyboardEvent, type ChangeEvent } from 'react';
import { Send, Paperclip } from 'lucide-react';
import { cn } from '@org/ui';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

interface ChatInputProps {
  onSend: (content: string) => void;
  onImageSelect?: (file: File) => void;
  disabled?: boolean;
  imagePreview?: string | null;
}

export function ChatInput({
  onSend,
  onImageSelect,
  disabled = false,
  imagePreview,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !onImageSelect) return;

      if (!ALLOWED_TYPES.includes(file.type)) {
        alert('Type de fichier non supporté. JPEG, PNG ou WebP requis.');
        e.target.value = '';
        return;
      }

      if (file.size > MAX_SIZE) {
        alert('Fichier trop volumineux. Taille maximale: 5MB.');
        e.target.value = '';
        return;
      }

      onImageSelect(file);
      e.target.value = '';
    },
    [onImageSelect],
  );

  return (
    <div className="flex flex-col border-t border-border bg-card">
      {imagePreview && (
        <div className="px-3 pt-2">
          <img
            src={imagePreview}
            alt="Aperçu de l'image"
            className="h-16 w-16 rounded-lg object-cover"
          />
        </div>
      )}
      <div className="flex items-end gap-2 p-3">
        {onImageSelect && (
          <div className="relative flex-shrink-0">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              disabled={disabled}
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-full',
                'bg-muted text-muted-foreground hover:bg-muted/80 transition-colors',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
              aria-label="Joindre une image"
            >
              <Paperclip className="h-4 w-4" />
            </button>
            {/* Camera-first input (opens camera on mobile) */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              className="sr-only"
              onChange={handleFileChange}
              aria-label="Prendre une photo"
            />
            {/* Gallery/file picker (secondary) */}
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={handleFileChange}
              aria-label="Choisir depuis la galerie"
            />
          </div>
        )}
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
    </div>
  );
}
