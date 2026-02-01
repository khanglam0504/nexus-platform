'use client';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { MessageItem } from './message-item';
import { X, Loader2, Pin } from 'lucide-react';
import { trpc } from '@/lib/trpc';

interface Props {
  channelId: string;
  currentUserId: string;
  onClose: () => void;
}

export function PinnedPanel({ channelId, currentUserId, onClose }: Props) {
  const { data, isLoading } = trpc.message.listPinned.useQuery({ channelId });

  return (
    <div className="w-full lg:w-96 border-l flex flex-col bg-card">
      <header className="h-14 border-b px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Pin className="h-4 w-4" />
          <h2 className="font-semibold">Pinned Messages</h2>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </header>

      <ScrollArea className="flex-1">
        {isLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )}

        {data && data.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Pin className="h-10 w-10 mb-4 opacity-50" />
            <p>No pinned messages</p>
            <p className="text-xs mt-1">Admins can pin important messages</p>
          </div>
        )}

        <div className="p-4 space-y-2">
          {data?.map((msg) => (
            <MessageItem
              key={msg.id}
              message={{ ...msg, reactions: [] }}
              channelId={channelId}
              currentUserId={currentUserId}
              onThreadClick={() => {}}
              isThreadReply
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
