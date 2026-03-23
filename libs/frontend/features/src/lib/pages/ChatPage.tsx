import { useNavigate, useParams } from 'react-router-dom';
import { MessageCircle, ChevronRight } from 'lucide-react';
import { SkeletonList, cn } from '@org/ui';
import { useChannels } from '../chat/hooks/useChat';
import { ChatChannel } from '../chat/ChatChannel';

function ChannelList({ activeChannelId }: { activeChannelId?: string }) {
  const navigate = useNavigate();
  const { data, isLoading } = useChannels();

  const channels = data?.data ?? [];

  if (isLoading) return <SkeletonList />;

  if (channels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <MessageCircle className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Aucun canal disponible pour ce club.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 py-4">
      <h2 className="px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Canaux
      </h2>
      <ul className="flex flex-col divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
        {channels.map((channel) => (
          <li key={channel.id}>
            <button
              type="button"
              className={cn(
                'flex w-full items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left',
                activeChannelId === channel.id && 'bg-muted/70',
              )}
              onClick={() => navigate(`/chat/${channel.id}`)}
            >
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                <MessageCircle className="h-4 w-4 text-primary" />
              </div>
              <span className="flex-1 text-sm font-medium">{channel.name}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ChatPage() {
  const { channelId } = useParams<{ channelId: string }>();

  return (
    <>
      {/* Mobile: show channel list OR conversation */}
      <div className="lg:hidden">
        {channelId ? (
          <ChatChannel channelId={channelId} />
        ) : (
          <div className="py-4">
            <h1 className="text-lg font-semibold">Chat</h1>
            <ChannelList />
          </div>
        )}
      </div>

      {/* Desktop: split layout — channel list on left, conversation on right */}
      <div className="hidden lg:grid lg:grid-cols-[280px,1fr] h-[calc(100dvh-3.5rem)]">
        {/* Left column: channel list */}
        <div className="border-r border-border overflow-y-auto px-3">
          <div className="py-4">
            <h1 className="text-lg font-semibold">Chat</h1>
            <ChannelList activeChannelId={channelId} />
          </div>
        </div>

        {/* Right column: active conversation */}
        <div className="overflow-hidden">
          {channelId ? (
            <ChatChannel channelId={channelId} />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageCircle className="mx-auto h-12 w-12 opacity-30" />
                <p className="mt-2 text-sm">Sélectionnez un canal</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
