'use client';

import { useState, useEffect } from 'react';
import { signOut } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Plus, Settings, LogOut, Home, Moon, Sun, Monitor, Bot } from 'lucide-react';
import { getInitials } from '@/lib/utils';
import type { Workspace } from '@prisma/client';
import { useTheme } from 'next-themes';

interface Props {
  workspace: Workspace;
  currentUser: { id: string; email: string; name?: string | null; image?: string | null };
}

export function Sidebar({ workspace, currentUser }: Props) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only rendering theme-dependent content after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const cycleTheme = () => {
    if (theme === 'dark') setTheme('light');
    else if (theme === 'light') setTheme('system');
    else setTheme('dark');
  };

  // Use Monitor as default during SSR, then show actual theme icon after hydration
  const ThemeIcon = !mounted ? Monitor : theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;

  return (
    <div className="w-16 bg-sidebar flex flex-col items-center py-3 gap-2 border-r border-border">
      {/* Home */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Link href="/workspace">
            <Button variant="ghost" size="icon" className="w-10 h-10 rounded-xl">
              <Home className="h-5 w-5" />
            </Button>
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right">Home</TooltipContent>
      </Tooltip>

      {/* Current Workspace */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-emerald-500 flex items-center justify-center text-primary-foreground cursor-pointer relative">
            <Bot className="h-5 w-5" />
            <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-sidebar" />
          </div>
        </TooltipTrigger>
        <TooltipContent side="right">{workspace.name}</TooltipContent>
      </Tooltip>

      {/* Add Network */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="w-10 h-10 rounded-xl border-2 border-dashed border-muted-foreground/30 hover:border-primary"
            onClick={() => router.push('/workspace/new')}
          >
            <Plus className="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">Create Agent Network</TooltipContent>
      </Tooltip>

      <div className="flex-1" />

      {/* Theme Toggle */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="w-10 h-10 rounded-xl"
            onClick={cycleTheme}
          >
            <ThemeIcon className="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">
          Theme: {!mounted ? 'System' : theme === 'dark' ? 'Dark' : theme === 'light' ? 'Light' : 'System'}
        </TooltipContent>
      </Tooltip>

      {/* User Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Avatar className="h-10 w-10 cursor-pointer">
            <AvatarImage src={currentUser.image || undefined} />
            <AvatarFallback>{getInitials(currentUser.name)}</AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="end" className="w-56">
          <div className="px-2 py-1.5">
            <p className="font-medium">{currentUser.name}</p>
            <p className="text-xs text-muted-foreground">{currentUser.email}</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => signOut({ callbackUrl: '/login' })}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
