import { z } from 'zod';
import { router, protectedProcedure } from '@/server/trpc';
import { generateSlug } from '@/lib/utils';
import { TRPCError } from '@trpc/server';

export const workspaceRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.workspace.findMany({
      where: {
        members: { some: { userId: ctx.session.user.id } },
      },
      include: {
        _count: { select: { members: true, channels: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }),

  get: protectedProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const workspace = await ctx.prisma.workspace.findUnique({
        where: { slug: input.slug },
        include: {
          channels: { orderBy: { name: 'asc' } },
          members: {
            include: { user: { select: { id: true, name: true, image: true } } },
          },
          agents: { where: { isActive: true } },
        },
      });

      if (!workspace) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Workspace not found' });
      }

      const isMember = workspace.members.some((m) => m.userId === ctx.session.user.id);
      if (!isMember) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not a member' });
      }

      return workspace;
    }),

  create: protectedProcedure
    .input(z.object({ name: z.string().min(2).max(50) }))
    .mutation(async ({ ctx, input }) => {
      const slug = generateSlug(input.name);

      const existing = await ctx.prisma.workspace.findUnique({ where: { slug } });
      if (existing) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Workspace slug already exists' });
      }

      const workspace = await ctx.prisma.workspace.create({
        data: {
          name: input.name,
          slug,
          members: {
            create: { userId: ctx.session.user.id, role: 'OWNER' },
          },
          channels: {
            create: { name: 'general', type: 'PUBLIC' },
          },
        },
      });

      return workspace;
    }),

  invite: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        email: z.string().email(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user has permission to invite (OWNER or ADMIN)
      const inviter = await ctx.prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: input.workspaceId,
            userId: ctx.session.user.id,
          },
        },
      });

      if (!inviter || !['OWNER', 'ADMIN'].includes(inviter.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only OWNER or ADMIN can invite members',
        });
      }

      const user = await ctx.prisma.user.findUnique({
        where: { email: input.email },
      });

      if (!user) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
      }

      const existing = await ctx.prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: input.workspaceId,
            userId: user.id,
          },
        },
      });

      if (existing) {
        throw new TRPCError({ code: 'CONFLICT', message: 'User already a member' });
      }

      await ctx.prisma.workspaceMember.create({
        data: {
          workspaceId: input.workspaceId,
          userId: user.id,
          role: 'MEMBER',
        },
      });

      return { success: true };
    }),

  // List all members of a workspace
  listMembers: protectedProcedure
    .input(z.object({ workspaceId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify user is a member
      const member = await ctx.prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: input.workspaceId,
            userId: ctx.session.user.id,
          },
        },
      });

      if (!member) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not a workspace member' });
      }

      return ctx.prisma.workspaceMember.findMany({
        where: { workspaceId: input.workspaceId },
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
        },
        orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
      });
    }),

  // Get current user's role in workspace
  getCurrentRole: protectedProcedure
    .input(z.object({ workspaceId: z.string() }))
    .query(async ({ ctx, input }) => {
      const member = await ctx.prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: input.workspaceId,
            userId: ctx.session.user.id,
          },
        },
      });

      if (!member) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not a workspace member' });
      }

      return { role: member.role };
    }),

  // Update member role (OWNER only)
  updateMemberRole: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        memberId: z.string(),
        role: z.enum(['ADMIN', 'MEMBER']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if current user is OWNER
      const currentUser = await ctx.prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: input.workspaceId,
            userId: ctx.session.user.id,
          },
        },
      });

      if (!currentUser || currentUser.role !== 'OWNER') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only OWNER can change member roles',
        });
      }

      const member = await ctx.prisma.workspaceMember.findUnique({
        where: { id: input.memberId },
      });

      if (!member) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      // Cannot change OWNER role
      if (member.role === 'OWNER') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot change owner role',
        });
      }

      // Cannot change own role
      if (member.userId === ctx.session.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot change own role',
        });
      }

      return ctx.prisma.workspaceMember.update({
        where: { id: input.memberId },
        data: { role: input.role },
      });
    }),

  // Remove member (OWNER or ADMIN)
  removeMember: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        memberId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check current user's role
      const currentUser = await ctx.prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: input.workspaceId,
            userId: ctx.session.user.id,
          },
        },
      });

      if (!currentUser || !['OWNER', 'ADMIN'].includes(currentUser.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
        });
      }

      const member = await ctx.prisma.workspaceMember.findUnique({
        where: { id: input.memberId },
      });

      if (!member) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      // Cannot remove OWNER
      if (member.role === 'OWNER') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot remove owner',
        });
      }

      // ADMIN can only remove MEMBER
      if (currentUser.role === 'ADMIN' && member.role !== 'MEMBER') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Admin can only remove members',
        });
      }

      // Cannot remove self
      if (member.userId === ctx.session.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot remove yourself',
        });
      }

      await ctx.prisma.workspaceMember.delete({ where: { id: input.memberId } });
      return { success: true };
    }),
});
