import { z } from 'zod';
import { router, protectedProcedure } from '@/server/trpc';
import { TRPCError } from '@trpc/server';
import { generateAgentResponse } from '@/lib/openclaw-connector';
import { emitNewMessage, emitAgentResponding } from '@/lib/socket-emitter';
import type { AgentType, AutonomyLevel } from '@prisma/client';

// Helper to calculate heartbeat status
function getHeartbeatStatus(
  lastHeartbeat: Date | null,
  intervalSeconds: number
): 'online' | 'stale' | 'offline' {
  if (!lastHeartbeat) return 'offline';
  const now = Date.now();
  const lastBeat = lastHeartbeat.getTime();
  const elapsed = (now - lastBeat) / 1000;

  if (elapsed <= intervalSeconds * 1.5) return 'online';
  if (elapsed <= intervalSeconds * 3) return 'stale';
  return 'offline';
}

export const agentRouter = router({
  list: protectedProcedure
    .input(z.object({ workspaceId: z.string() }))
    .query(async ({ ctx, input }) => {
      const agents = await ctx.prisma.agent.findMany({
        where: { workspaceId: input.workspaceId, isActive: true },
        orderBy: { name: 'asc' },
        include: { context: true },
      });

      return agents.map((agent) => ({
        ...agent,
        heartbeatStatus: getHeartbeatStatus(agent.lastHeartbeat, agent.heartbeatInterval),
      }));
    }),

  getById: protectedProcedure
    .input(z.object({ agentId: z.string() }))
    .query(async ({ ctx, input }) => {
      const agent = await ctx.prisma.agent.findUnique({
        where: { id: input.agentId },
        include: {
          workspace: { select: { id: true, name: true } },
          context: true,
        },
      });

      if (!agent) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Agent not found' });
      }

      return {
        ...agent,
        heartbeatStatus: getHeartbeatStatus(agent.lastHeartbeat, agent.heartbeatInterval),
      };
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2).max(50),
        workspaceId: z.string(),
        description: z.string().optional(),
        type: z.enum(['ASSISTANT', 'CODER', 'ANALYST', 'RESEARCHER']).default('ASSISTANT'),
        autonomyLevel: z.enum(['INTERN', 'SPECIALIST', 'LEAD', 'AUTONOMOUS']).default('SPECIALIST'),
        config: z.record(z.any()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const agent = await ctx.prisma.agent.create({
        data: {
          name: input.name,
          description: input.description,
          type: input.type,
          autonomyLevel: input.autonomyLevel,
          config: input.config,
          workspaceId: input.workspaceId,
        },
      });

      // Create initial context for the agent
      await ctx.prisma.agentContext.create({
        data: { agentId: agent.id },
      });

      return agent;
    }),

  update: protectedProcedure
    .input(
      z.object({
        agentId: z.string(),
        name: z.string().min(2).max(50).optional(),
        description: z.string().optional(),
        type: z.enum(['ASSISTANT', 'CODER', 'ANALYST', 'RESEARCHER']).optional(),
        autonomyLevel: z.enum(['INTERN', 'SPECIALIST', 'LEAD', 'AUTONOMOUS']).optional(),
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
        include: { context: true },
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
      const conversationHistory = recentMessages.slice(0, -1).map((msg) => ({
        role: (msg.agentId ? 'assistant' : 'user') as 'user' | 'assistant',
        content: msg.agentId ? msg.content : `${msg.user?.name || 'User'}: ${msg.content}`,
      }));

      // Get agent config
      const agentConfig = (agent.config as Record<string, unknown>) || {};
      const openclawConfig = agentConfig.openclaw as { gatewayUrl?: string; token?: string } | undefined;

      // Generate AI response using OpenClaw connector, including agent context
      // Pass gateway config if available for local OpenClaw connection
      const agentResponseContent = await generateAgentResponse(
        agent.type as AgentType,
        input.message,
        conversationHistory,
        {
          model: agentConfig.model as string | undefined,
          temperature: agentConfig.temperature as number | undefined,
          maxTokens: agentConfig.maxTokens as number | undefined,
          customPrompt: agentConfig.customPrompt as string | undefined,
        },
        {
          workingState: agent.context?.workingState,
          longTermMemory: agent.context?.longTermMemory,
        },
        openclawConfig,
        `nexus-${input.channelId}` // Session key based on channel
      );

      // Determine if message needs approval based on autonomy level
      const needsApproval = agent.autonomyLevel === 'INTERN';

      // Create agent response message
      const response = await ctx.prisma.message.create({
        data: {
          content: agentResponseContent,
          channelId: input.channelId,
          agentId: input.agentId,
          threadId: input.threadId,
          needsApproval,
        },
        include: {
          agent: { select: { id: true, name: true, avatar: true, type: true } },
        },
      });

      // Update agent context (lastAction, workingState)
      const currentWorkingState = (agent.context?.workingState as Record<string, any>) || {};
      await ctx.prisma.agentContext.upsert({
        where: { agentId: agent.id },
        update: {
          workingState: {
            ...currentWorkingState,
            lastAction: `Responded to: ${input.message.slice(0, 50)}...`,
            lastResponseAt: new Date().toISOString(),
          },
        },
        create: {
          agentId: agent.id,
          workingState: {
            lastAction: `Responded to: ${input.message.slice(0, 50)}...`,
            lastResponseAt: new Date().toISOString(),
          },
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
        needsApproval: response.needsApproval,
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
        include: { context: true },
      });

      if (!agent) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Agent not found' });
      }

      const agentConfig = (agent.config as Record<string, unknown>) || {};
      const openclawConfig = agentConfig.openclaw as { gatewayUrl?: string; token?: string } | undefined;

      // Generate AI response directly with context
      const responseContent = await generateAgentResponse(
        agent.type as AgentType,
        input.message,
        [],
        {
          model: agentConfig.model as string | undefined,
          temperature: agentConfig.temperature as number | undefined,
          maxTokens: agentConfig.maxTokens as number | undefined,
          customPrompt: agentConfig.customPrompt as string | undefined,
        },
        {
          workingState: agent.context?.workingState,
          longTermMemory: agent.context?.longTermMemory,
        },
        openclawConfig,
        `nexus-agent-${input.agentId}`
      );

      // Update agent context (lastAction, workingState)
      const currentWorkingState = (agent.context?.workingState as Record<string, any>) || {};
      await ctx.prisma.agentContext.upsert({
        where: { agentId: agent.id },
        update: {
          workingState: {
            ...currentWorkingState,
            lastAction: `Quick Chat: ${input.message.slice(0, 50)}...`,
            lastResponseAt: new Date().toISOString(),
          },
        },
        create: {
          agentId: agent.id,
          workingState: {
            lastAction: `Quick Chat: ${input.message.slice(0, 50)}...`,
            lastResponseAt: new Date().toISOString(),
          },
        },
      });

      return {
        content: responseContent,
        agentId: agent.id,
        agentName: agent.name,
        agentType: agent.type,
      };
    }),

  // Heartbeat endpoint - agents call this to signal they're alive
  heartbeat: protectedProcedure
    .input(z.object({ agentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const agent = await ctx.prisma.agent.update({
        where: { id: input.agentId },
        data: { lastHeartbeat: new Date() },
      });

      return {
        agentId: agent.id,
        lastHeartbeat: agent.lastHeartbeat,
        heartbeatStatus: getHeartbeatStatus(agent.lastHeartbeat, agent.heartbeatInterval),
      };
    }),

  // Update heartbeat interval
  updateHeartbeatInterval: protectedProcedure
    .input(
      z.object({
        agentId: z.string(),
        intervalSeconds: z.number().min(5).max(300),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.agent.update({
        where: { id: input.agentId },
        data: { heartbeatInterval: input.intervalSeconds },
      });
    }),

  // Get/Update agent context (working state)
  getContext: protectedProcedure
    .input(z.object({ agentId: z.string() }))
    .query(async ({ ctx, input }) => {
      const context = await ctx.prisma.agentContext.findUnique({
        where: { agentId: input.agentId },
      });

      if (!context) {
        // Create one if it doesn't exist
        return ctx.prisma.agentContext.create({
          data: { agentId: input.agentId },
        });
      }

      return context;
    }),

  updateContext: protectedProcedure
    .input(
      z.object({
        agentId: z.string(),
        workingState: z.record(z.any()).optional(),
        dailyNotes: z.string().optional(),
        longTermMemory: z.string().optional(),
        isLoading: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { agentId, ...updateData } = input;

      return ctx.prisma.agentContext.upsert({
        where: { agentId },
        update: updateData,
        create: { agentId, ...updateData },
      });
    }),

  // Set context loading state
  setContextLoading: protectedProcedure
    .input(
      z.object({
        agentId: z.string(),
        isLoading: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.agentContext.upsert({
        where: { agentId: input.agentId },
        update: { isLoading: input.isLoading },
        create: { agentId: input.agentId, isLoading: input.isLoading },
      });
    }),

  // Update autonomy level
  updateAutonomyLevel: protectedProcedure
    .input(
      z.object({
        agentId: z.string(),
        autonomyLevel: z.enum(['INTERN', 'SPECIALIST', 'LEAD', 'AUTONOMOUS']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.agent.update({
        where: { id: input.agentId },
        data: { autonomyLevel: input.autonomyLevel },
      });
    }),

  // Approve an agent's message (only for LEAD/AUTONOMOUS agents or Admin users)
  approveMessage: protectedProcedure
    .input(z.object({ messageId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Check if user has permission to approve (Lead agent or Admin)
      // For now, any user in the workspace can approve, but we can restrict this
      const message = await ctx.prisma.message.findUnique({
        where: { id: input.messageId },
        include: { agent: true },
      });

      if (!message) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Message not found' });
      }

      if (!message.needsApproval) {
        return message;
      }

      return ctx.prisma.message.update({
        where: { id: input.messageId },
        data: {
          needsApproval: false,
          approvedBy: ctx.session.user.id,
          approvedAt: new Date(),
        },
      });
    }),

  // Utility to check for stale agents and potentially trigger notifications or status updates
  cleanupStaleAgents: protectedProcedure
    .input(z.object({ workspaceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const agents = await ctx.prisma.agent.findMany({
        where: { workspaceId: input.workspaceId, isActive: true },
      });

      const results = {
        total: agents.length,
        online: 0,
        stale: 0,
        offline: 0,
      };

      for (const agent of agents) {
        const status = getHeartbeatStatus(agent.lastHeartbeat, agent.heartbeatInterval);
        results[status]++;

        // If an agent is offline, we could perform some cleanup or alert
        if (status === 'offline') {
          // Optional: mark as inactive if offline for too long
          // await ctx.prisma.agent.update({ where: { id: agent.id }, data: { isActive: false } });
        }
      }

      return results;
    }),
});
