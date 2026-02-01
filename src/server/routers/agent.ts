import { z } from 'zod';
import { router, protectedProcedure } from '@/server/trpc';
import { TRPCError } from '@trpc/server';
import { generateAgentResponse } from '@/lib/openclaw-connector';
import { emitNewMessage, emitAgentResponding } from '@/lib/socket-emitter';
import type { AgentType } from '@prisma/client';

export const agentRouter = router({
  list: protectedProcedure
    .input(z.object({ workspaceId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.agent.findMany({
        where: { workspaceId: input.workspaceId, isActive: true },
        orderBy: { name: 'asc' },
      });
    }),

  getById: protectedProcedure
    .input(z.object({ agentId: z.string() }))
    .query(async ({ ctx, input }) => {
      const agent = await ctx.prisma.agent.findUnique({
        where: { id: input.agentId },
        include: {
          workspace: { select: { id: true, name: true } },
        },
      });

      if (!agent) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Agent not found' });
      }

      return agent;
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

  update: protectedProcedure
    .input(
      z.object({
        agentId: z.string(),
        name: z.string().min(2).max(50).optional(),
        description: z.string().optional(),
        type: z.enum(['ASSISTANT', 'CODER', 'ANALYST', 'RESEARCHER']).optional(),
        config: z.record(z.any()).optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { agentId, ...updateData } = input;

      return ctx.prisma.agent.update({
        where: { id: agentId },
        data: updateData,
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
      const userMessage = await ctx.prisma.message.create({
        data: {
          content: input.message,
          channelId: input.channelId,
          userId: ctx.session.user.id,
          threadId: input.threadId,
        },
        include: {
          user: { select: { id: true, name: true, image: true } },
        },
      });

      // Emit the user message via socket
      emitNewMessage(input.channelId, {
        id: userMessage.id,
        content: userMessage.content,
        channelId: userMessage.channelId,
        userId: userMessage.userId,
        agentId: userMessage.agentId,
        threadId: userMessage.threadId,
        createdAt: userMessage.createdAt.toISOString(),
        user: userMessage.user || undefined,
      });

      // Emit agent is responding indicator
      emitAgentResponding(input.channelId, {
        channelId: input.channelId,
        agentId: agent.id,
        agentName: agent.name,
      });

      // Fetch recent conversation history for context
      const recentMessages = await ctx.prisma.message.findMany({
        where: {
          channelId: input.channelId,
          threadId: input.threadId || null,
          createdAt: {
            gte: new Date(Date.now() - 30 * 60 * 1000), // Last 30 minutes
          },
        },
        orderBy: { createdAt: 'asc' },
        take: 10,
        include: {
          user: { select: { name: true } },
          agent: { select: { name: true } },
        },
      });

      // Build conversation history for AI context
      const conversationHistory = recentMessages.slice(0, -1).map(msg => ({
        role: (msg.agentId ? 'assistant' : 'user') as 'user' | 'assistant',
        content: msg.agentId
          ? msg.content
          : `${msg.user?.name || 'User'}: ${msg.content}`,
      }));

      // Get agent config
      const agentConfig = (agent.config as Record<string, unknown>) || {};

      // Generate AI response using OpenClaw connector
      const agentResponseContent = await generateAgentResponse(
        agent.type as AgentType,
        input.message,
        conversationHistory,
        {
          model: agentConfig.model as string | undefined,
          temperature: agentConfig.temperature as number | undefined,
          maxTokens: agentConfig.maxTokens as number | undefined,
          customPrompt: agentConfig.customPrompt as string | undefined,
        }
      );

      // Create agent response message
      const response = await ctx.prisma.message.create({
        data: {
          content: agentResponseContent,
          channelId: input.channelId,
          agentId: input.agentId,
          threadId: input.threadId,
        },
        include: {
          agent: { select: { id: true, name: true, avatar: true, type: true } },
        },
      });

      // Emit agent response via socket
      emitNewMessage(input.channelId, {
        id: response.id,
        content: response.content,
        channelId: response.channelId,
        userId: response.userId,
        agentId: response.agentId,
        threadId: response.threadId,
        createdAt: response.createdAt.toISOString(),
        agent: response.agent || undefined,
      });

      return response;
    }),

  // Quick chat without creating a user message (for AI-only interactions)
  quickChat: protectedProcedure
    .input(
      z.object({
        agentId: z.string(),
        message: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const agent = await ctx.prisma.agent.findUnique({
        where: { id: input.agentId },
      });

      if (!agent) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Agent not found' });
      }

      const agentConfig = (agent.config as Record<string, unknown>) || {};

      // Generate AI response directly
      const responseContent = await generateAgentResponse(
        agent.type as AgentType,
        input.message,
        [],
        {
          model: agentConfig.model as string | undefined,
          temperature: agentConfig.temperature as number | undefined,
          maxTokens: agentConfig.maxTokens as number | undefined,
          customPrompt: agentConfig.customPrompt as string | undefined,
        }
      );

      return {
        content: responseContent,
        agentId: agent.id,
        agentName: agent.name,
        agentType: agent.type,
      };
    }),
});
