import { z } from 'zod';
import { router, protectedProcedure } from '@/server/trpc';
import { TRPCError } from '@trpc/server';

export const channelGroupRouter = router({
  list: protectedProcedure
    .input(z.object({ workspaceId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.channelGroup.findMany({
        where: { workspaceId: input.workspaceId },
        orderBy: { position: 'asc' },
        include: {
          channels: {
            orderBy: { position: 'asc' },
            include: {
              channelAgents: {
                include: { agent: true },
              },
            },
          },
        },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(50),
        workspaceId: z.string(),
        description: z.string().optional(),
        icon: z.string().optional(),
        color: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check for duplicate name
      const existing = await ctx.prisma.channelGroup.findFirst({
        where: { workspaceId: input.workspaceId, name: input.name },
      });

      if (existing) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Group name already exists' });
      }

      // Get max position
      const maxPos = await ctx.prisma.channelGroup.aggregate({
        where: { workspaceId: input.workspaceId },
        _max: { position: true },
      });

      return ctx.prisma.channelGroup.create({
        data: {
          name: input.name,
          description: input.description,
          icon: input.icon,
          color: input.color,
          position: (maxPos._max.position ?? -1) + 1,
          workspaceId: input.workspaceId,
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(50).optional(),
        description: z.string().optional(),
        icon: z.string().optional(),
        color: z.string().optional(),
        isCollapsed: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.prisma.channelGroup.update({
        where: { id },
        data,
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Move all channels in this group to ungrouped
      await ctx.prisma.channel.updateMany({
        where: { groupId: input.id },
        data: { groupId: null },
      });

      await ctx.prisma.channelGroup.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  reorder: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        groupIds: z.array(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const updates = input.groupIds.map((id, index) =>
        ctx.prisma.channelGroup.update({
          where: { id },
          data: { position: index },
        })
      );

      await ctx.prisma.$transaction(updates);
      return { success: true };
    }),
});
