import { z } from 'zod';
import { router, protectedProcedure } from '@/server/trpc';
import { TRPCError } from '@trpc/server';
import { generateAgentResponse } from '@/lib/openclaw-connector';
import { emitDebateTurn, emitDebateStatusChange } from '@/lib/socket-emitter';
type AgentType = 'ASSISTANT' | 'CODER' | 'ANALYST' | 'RESEARCHER';
type DebateStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

// Debate orchestration system prompts
const DEBATE_ROLE_PROMPTS: Record<string, string> = {
  advocate: `You are arguing IN FAVOR of the proposed solution. Present strong arguments, evidence, and benefits. Be constructive and solution-oriented.`,
  critic: `You are providing CRITICAL analysis of the proposed solution. Identify potential issues, risks, and weaknesses. Be thorough but fair.`,
  moderator: `You are MODERATING this debate. Synthesize arguments from both sides, identify common ground, and guide toward consensus. Be balanced and objective.`,
  default: `You are participating in a collaborative debate. Share your perspective, consider other viewpoints, and work toward the best solution.`,
};

export const debateRouter = router({
  // Create a new debate session
  create: protectedProcedure
    .input(
      z.object({
        channelId: z.string(),
        title: z.string().min(2).max(200),
        task: z.string().min(10),
        agentIds: z.array(z.string()).min(2).max(5),
        maxTurns: z.number().min(1).max(10).default(5),
        roles: z.record(z.string(), z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify all agents exist and belong to same workspace
      const agents = await ctx.prisma.agent.findMany({
        where: { id: { in: input.agentIds }, isActive: true },
        include: { workspace: true },
      });

      if (agents.length !== input.agentIds.length) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'One or more agents not found or inactive',
        });
      }

      // Verify channel exists
      const channel = await ctx.prisma.channel.findUnique({
        where: { id: input.channelId },
      });

      if (!channel) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Channel not found' });
      }

      // Create debate session with agents
      const session = await ctx.prisma.debateSession.create({
        data: {
          title: input.title,
          task: input.task,
          channelId: input.channelId,
          maxTurns: input.maxTurns,
          createdBy: ctx.session.user.id,
          agents: {
            create: input.agentIds.map((agentId) => ({
              agentId,
              role: input.roles?.[agentId] || null,
            })),
          },
        },
        include: {
          agents: { include: { agent: true } },
          creator: { select: { id: true, name: true } },
        },
      });

      return session;
    }),

  // Get debate session by ID
  getById: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const session = await ctx.prisma.debateSession.findUnique({
        where: { id: input.sessionId },
        include: {
          agents: { include: { agent: true } },
          turns: {
            include: { debateAgent: { include: { agent: true } } },
            orderBy: { turnNumber: 'asc' },
          },
          creator: { select: { id: true, name: true } },
          channel: { select: { id: true, name: true } },
        },
      });

      if (!session) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Debate session not found' });
      }

      return session;
    }),

  // List debate sessions for a channel
  list: protectedProcedure
    .input(
      z.object({
        channelId: z.string(),
        status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
        limit: z.number().min(1).max(50).default(20),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const sessions = await ctx.prisma.debateSession.findMany({
        where: {
          channelId: input.channelId,
          ...(input.status && { status: input.status }),
        },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { createdAt: 'desc' },
        include: {
          agents: { include: { agent: { select: { id: true, name: true, avatar: true } } } },
          creator: { select: { id: true, name: true } },
          _count: { select: { turns: true } },
        },
      });

      let nextCursor: string | undefined;
      if (sessions.length > input.limit) {
        const nextItem = sessions.pop();
        nextCursor = nextItem!.id;
      }

      return { sessions, nextCursor };
    }),

  // Start a debate session
  start: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const session = await ctx.prisma.debateSession.findUnique({
        where: { id: input.sessionId },
        include: { agents: { include: { agent: true } } },
      });

      if (!session) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Debate session not found' });
      }

      if (session.status !== 'PENDING') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Debate already started or completed' });
      }

      const updatedSession = await ctx.prisma.debateSession.update({
        where: { id: input.sessionId },
        data: { status: 'IN_PROGRESS' },
        include: {
          agents: { include: { agent: true } },
          channel: { select: { id: true, name: true } },
        },
      });

      // Emit status change
      emitDebateStatusChange(session.channelId, {
        sessionId: session.id,
        status: 'IN_PROGRESS',
        title: session.title,
      });

      return updatedSession;
    }),

  // Execute next turn in debate
  nextTurn: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const session = await ctx.prisma.debateSession.findUnique({
        where: { id: input.sessionId },
        include: {
          agents: { include: { agent: true } },
          turns: {
            orderBy: { turnNumber: 'desc' },
            take: 10,
            include: { debateAgent: { include: { agent: true } } },
          },
        },
      });

      if (!session) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Debate session not found' });
      }

      if (session.status !== 'IN_PROGRESS') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Debate not in progress' });
      }

      if (session.currentTurn >= session.maxTurns * session.agents.length) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Max turns reached' });
      }

      // Determine which agent's turn it is (round-robin)
      const agentIndex = session.currentTurn % session.agents.length;
      const currentDebateAgent = session.agents[agentIndex];
      const agent = currentDebateAgent.agent;

      // Build conversation context
      const conversationHistory = session.turns.reverse().map((turn) => ({
        role: 'assistant' as const,
        content: `[${turn.debateAgent.agent.name}]: ${turn.content}`,
      }));

      // Build debate-specific prompt
      const rolePrompt = DEBATE_ROLE_PROMPTS[currentDebateAgent.role || 'default'];
      const debateContext = `
You are participating in a multi-agent debate on the following task:

**Task:** ${session.task}

**Your Role:** ${currentDebateAgent.role || 'Participant'}
${rolePrompt}

This is turn ${session.currentTurn + 1} of ${session.maxTurns * session.agents.length}.
Consider previous arguments and build upon or counter them constructively.
Keep your response focused and under 300 words.
`;

      // Generate agent response
      const responseContent = await generateAgentResponse(
        agent.type as AgentType,
        debateContext,
        conversationHistory,
        {
          temperature: 0.8,
          maxTokens: 500,
        }
      );

      // Create the turn
      const turn = await ctx.prisma.debateTurn.create({
        data: {
          debateSessionId: session.id,
          debateAgentId: currentDebateAgent.id,
          turnNumber: session.currentTurn + 1,
          content: responseContent,
        },
        include: {
          debateAgent: { include: { agent: true } },
        },
      });

      // Update session turn counter
      const newTurnCount = session.currentTurn + 1;
      const isComplete = newTurnCount >= session.maxTurns * session.agents.length;

      await ctx.prisma.debateSession.update({
        where: { id: session.id },
        data: {
          currentTurn: newTurnCount,
          ...(isComplete && {
            status: 'COMPLETED' as DebateStatus,
            completedAt: new Date(),
          }),
        },
      });

      // Emit the turn via socket
      emitDebateTurn(session.channelId, {
        sessionId: session.id,
        turn: {
          id: turn.id,
          turnNumber: turn.turnNumber,
          content: turn.content,
          agentId: agent.id,
          agentName: agent.name,
          agentAvatar: agent.avatar,
          createdAt: turn.createdAt.toISOString(),
        },
        isComplete,
      });

      if (isComplete) {
        emitDebateStatusChange(session.channelId, {
          sessionId: session.id,
          status: 'COMPLETED',
          title: session.title,
        });
      }

      return { turn, isComplete };
    }),

  // Run full debate automatically
  runFull: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ ctx, input }): Promise<{ turns: Array<{ id: string; turnNumber: number; content: string }>; isComplete: boolean }> => {
      // Start the debate first
      let session = await ctx.prisma.debateSession.findUnique({
        where: { id: input.sessionId },
        include: { agents: { include: { agent: true } } },
      });

      if (!session) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Debate session not found' });
      }

      if (session.status === 'PENDING') {
        await ctx.prisma.debateSession.update({
          where: { id: input.sessionId },
          data: { status: 'IN_PROGRESS' },
        });
        session = { ...session, status: 'IN_PROGRESS' as DebateStatus };

        emitDebateStatusChange(session.channelId, {
          sessionId: session.id,
          status: 'IN_PROGRESS',
          title: session.title,
        });
      }

      if (session.status !== 'IN_PROGRESS') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Debate not in progress' });
      }

      const totalTurns = session.maxTurns * session.agents.length;
      const turns: Array<{ id: string; turnNumber: number; content: string }> = [];

      // Run all remaining turns inline (avoid circular reference)
      for (let currentTurn = session.currentTurn; currentTurn < totalTurns; currentTurn++) {
        // Determine which agent's turn it is (round-robin)
        const agentIndex = currentTurn % session.agents.length;
        const currentDebateAgent = session.agents[agentIndex];
        const agent = currentDebateAgent.agent;

        // Fetch existing turns for context
        const existingTurns = await ctx.prisma.debateTurn.findMany({
          where: { debateSessionId: session.id },
          orderBy: { turnNumber: 'desc' },
          take: 10,
          include: { debateAgent: { include: { agent: true } } },
        });

        // Build conversation context
        const conversationHistory = existingTurns.reverse().map((turn) => ({
          role: 'assistant' as const,
          content: `[${turn.debateAgent.agent.name}]: ${turn.content}`,
        }));

        // Build debate-specific prompt
        const rolePrompt = DEBATE_ROLE_PROMPTS[currentDebateAgent.role || 'default'];
        const debateContext = `
You are participating in a multi-agent debate on the following task:

**Task:** ${session.task}

**Your Role:** ${currentDebateAgent.role || 'Participant'}
${rolePrompt}

This is turn ${currentTurn + 1} of ${totalTurns}.
Consider previous arguments and build upon or counter them constructively.
Keep your response focused and under 300 words.
`;

        // Generate agent response
        const responseContent = await generateAgentResponse(
          agent.type as AgentType,
          debateContext,
          conversationHistory,
          { temperature: 0.8, maxTokens: 500 }
        );

        // Create the turn
        const turn = await ctx.prisma.debateTurn.create({
          data: {
            debateSessionId: session.id,
            debateAgentId: currentDebateAgent.id,
            turnNumber: currentTurn + 1,
            content: responseContent,
          },
          include: { debateAgent: { include: { agent: true } } },
        });

        // Update session turn counter
        const newTurnCount = currentTurn + 1;
        const isComplete = newTurnCount >= totalTurns;

        await ctx.prisma.debateSession.update({
          where: { id: session.id },
          data: {
            currentTurn: newTurnCount,
            ...(isComplete && {
              status: 'COMPLETED' as DebateStatus,
              completedAt: new Date(),
            }),
          },
        });

        // Emit the turn via socket
        emitDebateTurn(session.channelId, {
          sessionId: session.id,
          turn: {
            id: turn.id,
            turnNumber: turn.turnNumber,
            content: turn.content,
            agentId: agent.id,
            agentName: agent.name,
            agentAvatar: agent.avatar,
            createdAt: turn.createdAt.toISOString(),
          },
          isComplete,
        });

        turns.push({ id: turn.id, turnNumber: turn.turnNumber, content: turn.content });

        // Add small delay between turns to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      emitDebateStatusChange(session.channelId, {
        sessionId: session.id,
        status: 'COMPLETED',
        title: session.title,
      });

      return { turns, isComplete: true };
    }),

  // Cancel a debate
  cancel: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const session = await ctx.prisma.debateSession.findUnique({
        where: { id: input.sessionId },
      });

      if (!session) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Debate session not found' });
      }

      if (session.status === 'COMPLETED' || session.status === 'CANCELLED') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Debate already ended' });
      }

      const updated = await ctx.prisma.debateSession.update({
        where: { id: input.sessionId },
        data: { status: 'CANCELLED' },
      });

      emitDebateStatusChange(session.channelId, {
        sessionId: session.id,
        status: 'CANCELLED',
        title: session.title,
      });

      return updated;
    }),

  // Generate summary for completed debate
  summarize: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const session = await ctx.prisma.debateSession.findUnique({
        where: { id: input.sessionId },
        include: {
          turns: {
            include: { debateAgent: { include: { agent: true } } },
            orderBy: { turnNumber: 'asc' },
          },
          agents: { include: { agent: true } },
        },
      });

      if (!session) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Debate session not found' });
      }

      if (session.status !== 'COMPLETED') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Debate not completed yet' });
      }

      // Build full debate transcript
      const transcript = session.turns
        .map((t) => `[${t.debateAgent.agent.name}]: ${t.content}`)
        .join('\n\n');

      const summaryPrompt = `
Summarize the following multi-agent debate:

**Task:** ${session.task}

**Participants:** ${session.agents.map((a) => `${a.agent.name} (${a.role || 'participant'})`).join(', ')}

**Debate Transcript:**
${transcript}

Provide a concise summary that includes:
1. Key arguments from each participant
2. Points of agreement
3. Remaining disagreements or concerns
4. Recommended conclusion or next steps
`;

      const summary = await generateAgentResponse('ANALYST', summaryPrompt, [], {
        temperature: 0.5,
        maxTokens: 800,
      });

      const updated = await ctx.prisma.debateSession.update({
        where: { id: input.sessionId },
        data: { summary },
      });

      return { summary: updated.summary };
    }),

  // Add/remove agents from channel
  addAgentToChannel: protectedProcedure
    .input(z.object({ channelId: z.string(), agentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.channelAgent.upsert({
        where: {
          channelId_agentId: { channelId: input.channelId, agentId: input.agentId },
        },
        update: { isActive: true },
        create: { channelId: input.channelId, agentId: input.agentId },
        include: { agent: true },
      });
    }),

  removeAgentFromChannel: protectedProcedure
    .input(z.object({ channelId: z.string(), agentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.channelAgent.update({
        where: {
          channelId_agentId: { channelId: input.channelId, agentId: input.agentId },
        },
        data: { isActive: false },
      });
    }),

  // List agents in a channel
  listChannelAgents: protectedProcedure
    .input(z.object({ channelId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.channelAgent.findMany({
        where: { channelId: input.channelId, isActive: true },
        include: { agent: true },
        orderBy: { joinedAt: 'asc' },
      });
    }),
});
