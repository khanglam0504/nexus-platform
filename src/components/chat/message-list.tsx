'use client';

import { useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageItem } from './message-item';
import { trpc } from '@/lib/trpc';
import { Loader2, Hash, MessageSquare, Sparkles } from 'lucide-react';

interface Props {
  channelId: string;
  channelName?: string;
  currentUserId: string;
  onThreadClick: (messageId: string) => void;
}

export function MessageList({
  channelId,
  channelName,
  currentUserId,
  onThreadClick,
}: Props) {
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
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <div className="relative">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">Loading messages...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <MessageSquare className="h-8 w-8 text-destructive" />
        </div>
        <div className="text-center">
          <p className="font-medium text-destructive">Failed to load messages</p>
          <p className="text-sm text-muted-foreground mt-1">
            Please try refreshing the page
          </p>
        </div>
      </div>
    );
  }

  const messages = data?.messages || [];

  return (
    <ScrollArea className="flex-1" ref={scrollRef}>
      <div className="p-4 space-y-1">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-8">
            {/* Channel Welcome */}
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
              <Hash className="h-10 w-10 text-primary" />
            </div>

            <h3 className="text-xl font-semibold mb-2">
              Welcome to #{channelName || 'this channel'}
            </h3>

            <p className="text-muted-foreground text-center max-w-md mb-6">
              This is the beginning of the{' '}
              <span className="font-medium text-foreground">
                #{channelName || 'channel'}
              </span>{' '}
              channel. Start a conversation by sending a message below.
            </p>

            {/* Tips */}
            <div className="grid gap-3 w-full max-w-sm">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-card border border-border">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <MessageSquare className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Send a message</p>
                  <p className="text-xs text-muted-foreground">
                    Type in the input below and press Enter
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-card border border-border">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Chat with AI agents</p>
                  <p className="text-xs text-muted-foreground">
                    Use @ to mention and chat with AI assistants
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Channel start indicator */}
            <div className="flex items-center justify-center py-8 mb-4">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Hash className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold text-lg">
                  #{channelName || 'channel'}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  This is the beginning of the channel history
                </p>
              </div>
            </div>

            {/* Messages */}
            {messages.map((message, index) => {
              const prevMessage = messages[index - 1];
              const showDateSeparator =
                index === 0 ||
                !isSameDay(
                  new Date(message.createdAt),
                  new Date(prevMessage?.createdAt)
                );

              return (
                <div key={message.id}>
                  {showDateSeparator && (
                    <div className="flex items-center gap-4 my-4">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-xs font-medium text-muted-foreground px-2 py-1 rounded-full bg-secondary">
                        {formatDateSeparator(new Date(message.createdAt))}
                      </span>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                  )}
                  <MessageItem
                    message={message}
                    currentUserId={currentUserId}
                    onThreadClick={() => onThreadClick(message.id)}
                    replyCount={message._count.replies}
                  />
                </div>
              );
            })}
          </>
        )}
      </div>
    </ScrollArea>
  );
}

function isSameDay(date1: Date, date2: Date): boolean {
  if (!date2) return false;
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function formatDateSeparator(date: Date): string {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  if (isSameDay(date, now)) {
    return 'Today';
  }

  if (isSameDay(date, yesterday)) {
    return 'Yesterday';
  }

  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}
