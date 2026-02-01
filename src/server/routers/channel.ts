import { z } from 'zod';
import { router, protectedProcedure } from '@/server/trpc';
import { TRPCError } from '@trpc/server';

export const channelRouter = router({
  list: protectedProcedure
    .input(z.object({ workspaceId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.channel.findMany({
        where: { workspaceId: input.workspaceId },
        orderBy: { name: 'asc' },
      });
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const channel = await ctx.prisma.channel.findUnique({
        where: { id: input.id },
        include: {
          workspace: {
            include: {
              members: { where: { userId: ctx.session.user.id } },
            },
          },
        },
      });

      if (!channel) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Channel not found' });
      }

      if (channel.workspace.members.length === 0) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not a workspace member' });
      }

      return channel;
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
        workspaceId: z.string(),
        description: z.string().optional(),
        type: z.enum(['PUBLIC', 'PRIVATE']).default('PUBLIC'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.channel.findFirst({
        where: { workspaceId: input.workspaceId, name: input.name },
      });

      if (existing) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Channel name already exists' });
      }

      return ctx.prisma.channel.create({
        data: {
          name: input.name,
          description: input.description,
          type: input.type,
          workspaceId: input.workspaceId,
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const channel = await ctx.prisma.channel.findUnique({
        where: { id: input.id },
        include: {
          workspace: {
            include: {
              members: {
                where: { userId: ctx.session.user.id, role: { in: ['OWNER', 'ADMIN'] } },
              },
            },
          },
        },
      });

      if (!channel) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      if (channel.workspace.members.length === 0) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      await ctx.prisma.channel.delete({ where: { id: input.id } });
      return { success: true };
    }),
});
