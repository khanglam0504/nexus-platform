'use client';

import { useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageItem } from './message-item';
import { trpc } from '@/lib/trpc';
import { Loader2 } from 'lucide-react';

interface Props {
  channelId: string;
  currentUserId: string;
  onThreadClick: (messageId: string) => void;
}

export function MessageList({ channelId, currentUserId, onThreadClick }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, error } = trpc.message.list.useQuery(
    { channelId, limit: 50 },
    { refetchInterval: 3000 } // Poll for new messages (temporary until Socket.io)
  );

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [data?.messages]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center text-destructive">
        Failed to load messages
      </div>
    );
  }

  const messages = data?.messages || [];

  return (
    <ScrollArea className="flex-1" ref={scrollRef}>
      <div className="p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <p>No messages yet.</p>
            <p className="text-sm">Be the first to send a message!</p>
          </div>
        ) : (
          messages.map((message) => (
            <MessageItem
              key={message.id}
              message={message}
              currentUserId={currentUserId}
              onThreadClick={() => onThreadClick(message.id)}
              replyCount={message._count.replies}
            />
          ))
        )}
      </div>
    </ScrollArea>
  );
}
