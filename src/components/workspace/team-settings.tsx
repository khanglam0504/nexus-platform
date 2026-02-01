'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { trpc } from '@/lib/trpc';
import { getInitials } from '@/lib/utils';
import { Loader2, UserPlus, Trash2, Crown, Shield, User } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  workspaceId: string;
  workspaceName: string;
  currentRole: string;
}

const ROLE_ICONS = {
  OWNER: Crown,
  ADMIN: Shield,
  MEMBER: User,
};

const ROLE_COLORS = {
  OWNER: 'text-yellow-500',
  ADMIN: 'text-blue-500',
  MEMBER: 'text-muted-foreground',
};

export function TeamSettings({ workspaceId, workspaceName, currentRole }: Props) {
  const [email, setEmail] = useState('');
  const utils = trpc.useUtils();

  const { data: members, isLoading } = trpc.workspace.listMembers.useQuery({
    workspaceId,
  });

  const invite = trpc.workspace.invite.useMutation({
    onSuccess: () => {
      setEmail('');
      utils.workspace.listMembers.invalidate({ workspaceId });
      toast.success('Member invited');
    },
    onError: (error) => toast.error(error.message),
  });

  const updateRole = trpc.workspace.updateMemberRole.useMutation({
    onSuccess: () => {
      utils.workspace.listMembers.invalidate({ workspaceId });
      toast.success('Role updated');
    },
    onError: (error) => toast.error(error.message),
  });

  const remove = trpc.workspace.removeMember.useMutation({
    onSuccess: () => {
      utils.workspace.listMembers.invalidate({ workspaceId });
      toast.success('Member removed');
    },
    onError: (error) => toast.error(error.message),
  });

  const canInvite = currentRole === 'OWNER' || currentRole === 'ADMIN';
  const canManageRoles = currentRole === 'OWNER';
  const canRemove = currentRole === 'OWNER' || currentRole === 'ADMIN';

  return (
    <div className="space-y-8">
      {/* Invite Section */}
      {canInvite && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Invite Members</h2>
          <div className="flex gap-3">
            <Input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="max-w-sm"
            />
            <Button
              onClick={() => invite.mutate({ workspaceId, email })}
              disabled={!email || invite.isPending}
            >
              {invite.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4 mr-2" />
              )}
              Invite
            </Button>
          </div>
        </div>
      )}

      {/* Members List */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">
          Team Members ({members?.length || 0})
        </h2>

        {isLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )}

        <div className="space-y-2">
          {members?.map((member) => {
            const RoleIcon =
              ROLE_ICONS[member.role as keyof typeof ROLE_ICONS] || User;
            const isOwner = member.role === 'OWNER';

            return (
              <div
                key={member.id}
                className="flex items-center gap-4 p-3 rounded-lg border bg-card"
              >
                <Avatar>
                  <AvatarImage src={member.user.image || undefined} />
                  <AvatarFallback>
                    {getInitials(member.user.name)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {member.user.name || 'Unknown'}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    {member.user.email}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {canManageRoles && !isOwner ? (
                    <Select
                      value={member.role}
                      onValueChange={(value) =>
                        updateRole.mutate({
                          workspaceId,
                          memberId: member.id,
                          role: value as 'ADMIN' | 'MEMBER',
                        })
                      }
                    >
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                        <SelectItem value="MEMBER">Member</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div
                      className={`flex items-center gap-1 ${ROLE_COLORS[member.role as keyof typeof ROLE_COLORS]}`}
                    >
                      <RoleIcon className="h-4 w-4" />
                      <span className="text-sm font-medium">{member.role}</span>
                    </div>
                  )}

                  {canRemove && !isOwner && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() =>
                        remove.mutate({ workspaceId, memberId: member.id })
                      }
                      disabled={remove.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
