'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './sidebar';
import { ChannelList } from './channel-list';
import { MobileHeader } from './mobile-header';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-media-query';
import type { Channel, WorkspaceMember, User, Workspace, AgentContext, AutonomyLevel, Agent, Prisma } from '@prisma/client';

type HeartbeatStatus = 'online' | 'stale' | 'offline';

type AgentWithContext = Agent & { context: AgentContext | null };

interface AgentWithLifecycle extends AgentWithContext {
  heartbeatStatus: HeartbeatStatus;
}

interface WorkspaceWithRelations extends Workspace {
  channels: Channel[];
  members: (WorkspaceMember & { user: Pick<User, 'id' | 'name' | 'image'> })[];
  agents: AgentWithLifecycle[];
}

interface Props {
  workspace: WorkspaceWithRelations;
  currentUser: { id: string; email: string; name?: string | null; image?: string | null };
  children: React.ReactNode;
}

export function WorkspaceLayout({ workspace, currentUser, children }: Props) {
  const [showMembers, setShowMembers] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();
  const pathname = usePathname();

  // Extract current channel name from pathname
  const channelId = pathname.split('/').pop();
  const currentChannel = workspace.channels.find((c) => c.id === channelId);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile Header */}
      {isMobile && (
        <div className="flex flex-col flex-1 min-w-0">
          <MobileHeader
            workspaceName={workspace.name}
            channelName={currentChannel?.name}
            onMenuClick={() => setSidebarOpen(true)}
          />
          <main className="flex-1 flex flex-col overflow-hidden">{children}</main>
        </div>
      )}

      {/* Mobile Sidebar Drawer */}
      {isMobile && (
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="p-0 w-80">
            <div className="flex h-full">
              <Sidebar workspace={workspace} currentUser={currentUser} />
              <ChannelList
                workspace={workspace}
                channels={workspace.channels}
                agents={workspace.agents}
                onChannelSelect={() => setSidebarOpen(false)}
              />
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* Desktop Layout */}
      {!isMobile && (
        <>
          {/* Workspace Sidebar */}
          <Sidebar workspace={workspace} currentUser={currentUser} />

          {/* Channel List */}
          <ChannelList
            workspace={workspace}
            channels={workspace.channels}
            agents={workspace.agents}
          />

          {/* Main Content */}
          <main className="flex-1 flex flex-col overflow-hidden">{children}</main>

          {/* Members Panel (optional) */}
          {showMembers && (
            <aside className="w-64 border-l border-border bg-card p-4">
              <h3 className="font-semibold mb-4">Members</h3>
              <div className="space-y-2">
                {workspace.members.map((member) => (
                  <div key={member.id} className="flex items-center gap-2 text-sm">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs">
                      {member.user.name?.[0] || '?'}
                    </div>
                    <span>{member.user.name}</span>
                  </div>
                ))}
              </div>
            </aside>
          )}
        </>
      )}
    </div>
  );
}
