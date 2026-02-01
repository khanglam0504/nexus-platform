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
});
