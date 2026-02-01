'use client';

import { Button } from '@/components/ui/button';
import { Menu, Hash } from 'lucide-react';

interface Props {
  workspaceName: string;
  channelName?: string;
  onMenuClick: () => void;
}

export function MobileHeader({ workspaceName, channelName, onMenuClick }: Props) {
  return (
    <header className="h-14 border-b flex items-center px-4 gap-3 shrink-0 bg-card lg:hidden">
      <Button variant="ghost" size="icon" onClick={onMenuClick} className="h-10 w-10">
        <Menu className="h-5 w-5" />
      </Button>

      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground truncate">{workspaceName}</p>
        {channelName && (
          <div className="flex items-center gap-1">
            <Hash className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold truncate">{channelName}</span>
          </div>
        )}
      </div>
    </header>
  );
}
