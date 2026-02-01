import { z } from 'zod';
import { router, protectedProcedure } from '@/server/trpc';
import { TRPCError } from '@trpc/server';

export const agentRouter = router({
  list: protectedProcedure
    .input(z.object({ workspaceId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.agent.findMany({
        where: { workspaceId: input.workspaceId, isActive: true },
        orderBy: { name: 'asc' },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2).max(50),
        workspaceId: z.string(),
        description: z.string().optional(),
        type: z.enum(['ASSISTANT', 'CODER', 'ANALYST', 'RESEARCHER']).default('ASSISTANT'),
        config: z.record(z.any()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.agent.create({
        data: {
          name: input.name,
          description: input.description,
          type: input.type,
          config: input.config,
          workspaceId: input.workspaceId,
        },
      });
    }),

  chat: protectedProcedure
    .input(
      z.object({
        agentId: z.string(),
        channelId: z.string(),
        message: z.string(),
        threadId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const agent = await ctx.prisma.agent.findUnique({
        where: { id: input.agentId },
      });

      if (!agent) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Agent not found' });
      }

      // Create user message first
      await ctx.prisma.message.create({
        data: {
          content: input.message,
          channelId: input.channelId,
          userId: ctx.session.user.id,
          threadId: input.threadId,
        },
      });

      // TODO: Integrate with actual AI API (OpenClaw/OpenAI)
      // For now, return a placeholder response
      const agentResponse = await generateAgentResponse(agent.type, input.message);

      const response = await ctx.prisma.message.create({
        data: {
          content: agentResponse,
          channelId: input.channelId,
          agentId: input.agentId,
          threadId: input.threadId,
        },
        include: {
          agent: { select: { id: true, name: true, avatar: true, type: true } },
        },
      });

      return response;
    }),
});

async function generateAgentResponse(type: string, message: string): Promise<string> {
  // Placeholder - will be replaced with actual AI integration
  const responses: Record<string, string> = {
    ASSISTANT: `I understand you said: "${message}". How can I help you further?`,
    CODER: `I'll help you with that code. Analyzing: "${message}"`,
    ANALYST: `Let me analyze that for you: "${message}"`,
    RESEARCHER: `I'll research that topic: "${message}"`,
  };
  return responses[type] || responses.ASSISTANT;
}
