'use client';

import { useState } from 'react';
import { Sidebar } from './sidebar';
import { ChannelList } from './channel-list';
import type { Channel, Agent, WorkspaceMember, User, Workspace } from '@prisma/client';

interface WorkspaceWithRelations extends Workspace {
  channels: Channel[];
  members: (WorkspaceMember & { user: Pick<User, 'id' | 'name' | 'image'> })[];
  agents: Agent[];
}

interface Props {
  workspace: WorkspaceWithRelations;
  currentUser: { id: string; email: string; name?: string | null; image?: string | null };
  children: React.ReactNode;
}

export function WorkspaceLayout({ workspace, currentUser, children }: Props) {
  const [showMembers, setShowMembers] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
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
    </div>
  );
}
