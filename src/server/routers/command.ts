import { z } from 'zod';
import { router, protectedProcedure } from '@/server/trpc';
import { TRPCError } from '@trpc/server';

export const commandRouter = router({
  // List commands for a workspace
  list: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        status: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED']).optional(),
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.prisma.command.findMany({
        where: {
          workspaceId: input.workspaceId,
          ...(input.status && { status: input.status }),
        },
        orderBy: { createdAt: 'desc' },
        take: input.limit,
      });
    }),

  // Send a command to the Master Agent
  send: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        content: z.string().min(1).max(4000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify user is member of workspace
      const membership = await ctx.prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: input.workspaceId,
            userId: ctx.session.user.id,
          },
        },
      });

      if (!membership) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Not a member of this workspace' });
      }

      // Get workspace with master agent
      const workspace = await ctx.prisma.workspace.findUnique({
        where: { id: input.workspaceId },
        include: {
          masterAgent: true,
        },
      });

      if (!workspace?.masterAgent) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No Master Agent configured for this workspace',
        });
      }

      // Create the command
      const command = await ctx.prisma.command.create({
        data: {
          content: input.content,
          workspaceId: input.workspaceId,
          status: 'PENDING',
        },
      });

      // Send command to Master Agent asynchronously
      sendToMasterAgent(workspace.masterAgent, command.id, input.content, input.workspaceId);

      return command;
    }),

  // Get command by ID
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const command = await ctx.prisma.command.findUnique({
        where: { id: input.id },
      });

      if (!command) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      return command;
    }),
});

// Send command to Master Agent's OpenClaw gateway
async function sendToMasterAgent(
  masterAgent: { id: string; name: string; config: string | null },
  commandId: string,
  content: string,
  workspaceId: string
) {
  const { prisma } = await import('@/lib/prisma');

  try {
    // Update status to PROCESSING
    await prisma.command.update({
      where: { id: commandId },
      data: { status: 'PROCESSING' },
    });

    // Parse agent config
    if (!masterAgent.config) {
      throw new Error('Master Agent has no configuration');
    }

    const config = JSON.parse(masterAgent.config);
    const openclawConfig = config.openclaw as { gatewayUrl?: string; token?: string } | undefined;

    if (!openclawConfig?.gatewayUrl || !openclawConfig?.token) {
      throw new Error('Master Agent OpenClaw not configured');
    }

    // Call Master Agent's gateway
    const baseUrl = openclawConfig.gatewayUrl.replace(/\/$/, '');
    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openclawConfig.token}`,
        'x-openclaw-session-key': `nexus-master-${workspaceId}`,
      },
      body: JSON.stringify({
        model: 'openclaw',
        messages: [
          {
            role: 'system',
            content: `You are the Master Agent managing this workspace. Break down tasks and delegate to sub-agents in appropriate channels. Use @mentions to assign work to specific agents.`,
          },
          { role: 'user', content: content },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const responseContent = data.choices?.[0]?.message?.content || 'No response';

    // Update command with response
    await prisma.command.update({
      where: { id: commandId },
      data: {
        status: 'COMPLETED',
        response: responseContent,
        completedAt: new Date(),
      },
    });
  } catch (error) {
    console.error('Master Agent command error:', error);

    // Update command as failed
    await prisma.command.update({
      where: { id: commandId },
      data: {
        status: 'FAILED',
        response: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
}
