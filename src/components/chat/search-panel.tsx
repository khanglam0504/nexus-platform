'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { X, Search, Loader2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useDebounce } from '@/hooks/use-debounce';
import { formatDate, getInitials } from '@/lib/utils';

interface Props {
  channelId: string;
  onClose: () => void;
  onSelectMessage: (messageId: string) => void;
}

export function SearchPanel({ channelId, onClose, onSelectMessage }: Props) {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);

  const { data, isLoading } = trpc.message.search.useQuery(
    { channelId, query: debouncedQuery },
    { enabled: debouncedQuery.length > 0 }
  );

  return (
    <div className="absolute inset-0 bg-background/95 backdrop-blur z-50 flex flex-col">
      <header className="h-14 border-b px-4 flex items-center gap-3 shrink-0">
        <Search className="h-5 w-5 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search messages..."
          className="flex-1 border-0 bg-transparent focus-visible:ring-0"
          autoFocus
        />
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

        {data?.messages && data.messages.length === 0 && debouncedQuery && (
          <p className="text-center text-muted-foreground py-8">No results found</p>
        )}

        {!debouncedQuery && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Search className="h-10 w-10 mb-4 opacity-50" />
            <p>Type to search messages</p>
          </div>
        )}

        {data?.messages?.map((msg) => (
          <button
            key={msg.id}
            onClick={() => onSelectMessage(msg.id)}
            className="w-full px-4 py-3 text-left hover:bg-secondary/50 border-b transition-colors"
          >
            <div className="flex items-center gap-2 mb-1">
              <Avatar className="h-6 w-6">
                <AvatarImage src={msg.user?.image || msg.agent?.avatar || undefined} />
                <AvatarFallback>{getInitials(msg.user?.name || msg.agent?.name)}</AvatarFallback>
              </Avatar>
              <span className="font-medium text-sm">{msg.user?.name || msg.agent?.name}</span>
              <span className="text-xs text-muted-foreground">{formatDate(msg.createdAt)}</span>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">{msg.content}</p>
          </button>
        ))}
      </ScrollArea>
    </div>
  );
}
