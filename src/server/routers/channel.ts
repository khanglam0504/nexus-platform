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
        include: {
          channelAgents: {
            include: { agent: true },
          },
        },
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
        agentIds: z.array(z.string()).optional(),
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
          channelAgents: input.agentIds?.length
            ? {
                create: input.agentIds.map((agentId) => ({ agentId })),
              }
            : undefined,
        },
        include: {
          channelAgents: {
            include: { agent: true },
          },
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

  // Get agents in a channel
  getAgents: protectedProcedure
    .input(z.object({ channelId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.channelAgent.findMany({
        where: { channelId: input.channelId },
        include: { agent: true },
      });
    }),

  // Add agent to channel
  addAgent: protectedProcedure
    .input(z.object({ channelId: z.string(), agentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Check if already exists
      const existing = await ctx.prisma.channelAgent.findUnique({
        where: {
          channelId_agentId: {
            channelId: input.channelId,
            agentId: input.agentId,
          },
        },
      });

      if (existing) {
        // Reactivate if inactive
        if (!existing.isActive) {
          return ctx.prisma.channelAgent.update({
            where: { id: existing.id },
            data: { isActive: true },
            include: { agent: true },
          });
        }
        throw new TRPCError({ code: 'CONFLICT', message: 'Agent already in channel' });
      }

      return ctx.prisma.channelAgent.create({
        data: {
          channelId: input.channelId,
          agentId: input.agentId,
        },
        include: { agent: true },
      });
    }),

  // Remove agent from channel
  removeAgent: protectedProcedure
    .input(z.object({ channelId: z.string(), agentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const channelAgent = await ctx.prisma.channelAgent.findUnique({
        where: {
          channelId_agentId: {
            channelId: input.channelId,
            agentId: input.agentId,
          },
        },
      });

      if (!channelAgent) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Agent not in channel' });
      }

      await ctx.prisma.channelAgent.delete({
        where: { id: channelAgent.id },
      });

      return { success: true };
    }),

  // Update channel (including agents)
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/).optional(),
        description: z.string().optional(),
        agentIds: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, agentIds, ...data } = input;

      // Update channel agents if provided
      if (agentIds !== undefined) {
        // Remove all existing agents
        await ctx.prisma.channelAgent.deleteMany({
          where: { channelId: id },
        });

        // Add new agents
        if (agentIds.length > 0) {
          await ctx.prisma.channelAgent.createMany({
            data: agentIds.map((agentId) => ({
              channelId: id,
              agentId,
            })),
          });
        }
      }

      return ctx.prisma.channel.update({
        where: { id },
        data,
        include: {
          channelAgents: {
            include: { agent: true },
          },
        },
      });
    }),
});
