'use client';

import { useState } from 'react';
import { MessageList } from './message-list';
import { MessageInput } from './message-input';
import { ThreadPanel } from './thread-panel';
import { SearchPanel } from './search-panel';
import { PinnedPanel } from './pinned-panel';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-media-query';
import {
  Hash,
  Users,
  Pin,
  Bell,
  Search,
  Settings,
  Bot,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { trpc } from '@/lib/trpc';
import type { Channel, Agent } from '@prisma/client';

interface Props {
  channel: Channel;
  agents: Agent[];
  currentUserId: string;
}

export function ChatArea({ channel, agents, currentUserId }: Props) {
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [showMembers, setShowMembers] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showPinned, setShowPinned] = useState(false);
  const isMobile = useIsMobile();

  const { data: pinnedCount } = trpc.message.pinnedCount.useQuery({
    channelId: channel.id,
  });

  const handleSearchSelect = (messageId: string) => {
    setShowSearch(false);
    // Could scroll to message if we implement refs
  };

  return (
    <div className="flex flex-1 overflow-hidden relative">
      {/* Main Chat */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Channel Header */}
        <header className="h-14 border-b border-border px-4 flex items-center justify-between shrink-0 bg-card/50">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
                <Hash className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <h1 className="font-semibold truncate">{channel.name}</h1>
                {channel.description && (
                  <p className="text-xs text-muted-foreground truncate">
                    {channel.description}
                  </p>
                )}
              </div>
            </div>

            {/* Active Agents Indicator */}
            {agents.length > 0 && (
              <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-xs">
                <Bot className="h-3 w-3 text-primary" />
                <span className="text-primary font-medium">
                  {agents.length} AI {agents.length === 1 ? 'agent' : 'agents'}
                </span>
              </div>
            )}
          </div>

          {/* Header Actions */}
          <div className="flex items-center gap-1">
            {/* Pin - hide on mobile to save space */}
            <div className="hidden sm:block">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={showPinned ? 'secondary' : 'ghost'}
                    size="icon"
                    className="h-8 w-8 relative"
                    onClick={() => setShowPinned(!showPinned)}
                  >
                    <Pin className="h-4 w-4" />
                    {pinnedCount && pinnedCount > 0 && (
                      <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center">
                        {pinnedCount}
                      </span>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Pinned messages</TooltipContent>
              </Tooltip>
            </div>

            <div className="hidden sm:block">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Bell className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Notifications</TooltipContent>
              </Tooltip>
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setShowSearch(true)}
                >
                  <Search className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Search in channel</TooltipContent>
            </Tooltip>

            <div className="hidden sm:block w-px h-5 bg-border mx-1" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={showMembers ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setShowMembers(!showMembers)}
                >
                  <Users className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {showMembers ? 'Hide members' : 'Show members'}
              </TooltipContent>
            </Tooltip>

            <div className="hidden sm:block">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Settings className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Channel settings</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </header>

        {/* Messages */}
        <MessageList
          channelId={channel.id}
          channelName={channel.name}
          currentUserId={currentUserId}
          onThreadClick={setSelectedThread}
        />

        {/* Input */}
        <MessageInput
          channelId={channel.id}
          agents={agents}
          placeholder={`Message #${channel.name}`}
        />
      </div>

      {/* Search Panel Overlay */}
      {showSearch && (
        <SearchPanel
          channelId={channel.id}
          onClose={() => setShowSearch(false)}
          onSelectMessage={handleSearchSelect}
        />
      )}

      {/* Thread Panel - Desktop: side-by-side, Mobile: sheet */}
      {selectedThread &&
        (isMobile ? (
          <Sheet
            open={!!selectedThread}
            onOpenChange={() => setSelectedThread(null)}
          >
            <SheetContent side="right" className="p-0 w-full sm:max-w-lg">
              <ThreadPanel
                messageId={selectedThread}
                channelId={channel.id}
                currentUserId={currentUserId}
                onClose={() => setSelectedThread(null)}
              />
            </SheetContent>
          </Sheet>
        ) : (
          <ThreadPanel
            messageId={selectedThread}
            channelId={channel.id}
            currentUserId={currentUserId}
            onClose={() => setSelectedThread(null)}
          />
        ))}

      {/* Pinned Panel - Desktop: side-by-side, Mobile: sheet */}
      {showPinned &&
        !selectedThread &&
        (isMobile ? (
          <Sheet open={showPinned} onOpenChange={setShowPinned}>
            <SheetContent side="right" className="p-0 w-full sm:max-w-lg">
              <PinnedPanel
                channelId={channel.id}
                currentUserId={currentUserId}
                onClose={() => setShowPinned(false)}
              />
            </SheetContent>
          </Sheet>
        ) : (
          <PinnedPanel
            channelId={channel.id}
            currentUserId={currentUserId}
            onClose={() => setShowPinned(false)}
          />
        ))}
    </div>
  );
}
