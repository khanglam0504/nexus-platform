// Agent Message API - Allows AI agents to send messages directly
// POST /api/agent/message
// Authorization: Bearer <agent-openclaw-token>
// Body: { channelId: string, content: string }

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { emitNewMessage } from '@/lib/socket-emitter';

export async function POST(req: NextRequest) {
  try {
    // Get authorization token
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }
    const token = authHeader.slice(7); // Remove "Bearer "

    // Parse request body
    const body = await req.json();
    const { channelId, content } = body;

    if (!channelId || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: channelId, content' },
        { status: 400 }
      );
    }

    // Find agent by matching token in config.openclaw.token
    const agents = await prisma.agent.findMany({
      where: { isActive: true },
      select: { id: true, name: true, config: true, avatar: true, type: true },
    });

    let matchedAgent = null;
    for (const agent of agents) {
      if (agent.config) {
        try {
          const config = JSON.parse(agent.config);
          if (config.openclaw?.token === token) {
            matchedAgent = agent;
            break;
          }
        } catch {
          // Invalid JSON config, skip
        }
      }
    }

    if (!matchedAgent) {
      return NextResponse.json(
        { error: 'Invalid token - no matching agent found' },
        { status: 401 }
      );
    }

    // Verify channel exists and agent has access
    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      include: {
        channelAgents: {
          where: { agentId: matchedAgent.id, isActive: true },
        },
      },
    });

    if (!channel) {
      return NextResponse.json(
        { error: 'Channel not found' },
        { status: 404 }
      );
    }

    // Check if agent is in the channel
    if (channel.channelAgents.length === 0) {
      return NextResponse.json(
        { error: 'Agent is not a member of this channel' },
        { status: 403 }
      );
    }

    // Create the message
    const message = await prisma.message.create({
      data: {
        content,
        channelId,
        agentId: matchedAgent.id,
      },
      include: {
        agent: { select: { id: true, name: true, avatar: true, type: true } },
      },
    });

    // Emit real-time socket event
    emitNewMessage(channelId, {
      id: message.id,
      content: message.content,
      channelId: message.channelId,
      userId: null,
      agentId: message.agentId,
      threadId: null,
      createdAt: message.createdAt.toISOString(),
      agent: message.agent || undefined,
    });

    // Trigger response from other agents in the channel (if any)
    // This allows agent-to-agent conversations
    triggerAgentResponses(channelId, matchedAgent.id, content);

    return NextResponse.json({
      success: true,
      message: {
        id: message.id,
        content: message.content,
        channelId: message.channelId,
        agentId: message.agentId,
        agentName: matchedAgent.name,
        createdAt: message.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Agent message API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Trigger responses from other agents in the channel
async function triggerAgentResponses(
  channelId: string,
  senderAgentId: string,
  messageContent: string
) {
  try {
    // Get other active agents in the channel
    const otherAgents = await prisma.channelAgent.findMany({
      where: {
        channelId,
        isActive: true,
        agentId: { not: senderAgentId }, // Exclude sender
      },
      include: {
        agent: {
          include: { context: true },
        },
      },
    });

    if (otherAgents.length === 0) return;

    // Get recent messages for context
    const recentMessages = await prisma.message.findMany({
      where: { channelId, threadId: null },
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true } },
        agent: { select: { name: true } },
      },
    });

    const conversationHistory = recentMessages.reverse().slice(0, -1).map((msg) => ({
      role: (msg.agentId ? 'assistant' : 'user') as 'user' | 'assistant',
      content: msg.agentId
        ? `${msg.agent?.name || 'Agent'}: ${msg.content}`
        : `${msg.user?.name || 'User'}: ${msg.content}`,
    }));

    // Check for @mentions to route to specific agents
    const mentionRegex = /@(\w+)/g;
    const mentions = [...messageContent.matchAll(mentionRegex)].map(m => m[1].toLowerCase());

    // Filter to mentioned agents, or respond with all if no mentions
    let agentsToRespond = otherAgents;
    if (mentions.length > 0) {
      agentsToRespond = otherAgents.filter(ca =>
        mentions.includes(ca.agent.name.toLowerCase())
      );
      if (agentsToRespond.length === 0) return; // Mentioned agents not in channel
    }

    // Import dynamically to avoid circular deps
    const { generateAgentResponse } = await import('@/lib/openclaw-connector');

    for (const ca of agentsToRespond) {
      const agent = ca.agent;
      const agentConfig = agent.config ? JSON.parse(agent.config) : {};
      const openclawConfig = agentConfig.openclaw as { gatewayUrl?: string; token?: string } | undefined;

      // Only respond if agent has OpenClaw connection
      if (!openclawConfig?.gatewayUrl || !openclawConfig?.token) continue;

      try {
        const responseContent = await generateAgentResponse(
          agent.type as 'ASSISTANT' | 'CODER' | 'ANALYST' | 'RESEARCHER',
          messageContent,
          conversationHistory,
          {
            model: agentConfig.model,
            customPrompt: agentConfig.customPrompt,
          },
          {
            workingState: agent.context?.workingState,
            longTermMemory: agent.context?.longTermMemory,
          },
          openclawConfig,
          `nexus-${channelId}`
        );

        // Create agent response
        const agentMessage = await prisma.message.create({
          data: {
            content: responseContent,
            channelId,
            agentId: agent.id,
          },
          include: {
            agent: { select: { id: true, name: true, avatar: true, type: true } },
          },
        });

        // Emit agent message
        emitNewMessage(channelId, {
          id: agentMessage.id,
          content: agentMessage.content,
          channelId: agentMessage.channelId,
          userId: null,
          agentId: agentMessage.agentId,
          threadId: null,
          createdAt: agentMessage.createdAt.toISOString(),
          agent: agentMessage.agent || undefined,
        });

        // If specific agents mentioned, respond with all of them
        // If no mentions, only respond with first agent
        if (mentions.length === 0) break;
      } catch (err) {
        console.error(`Agent ${agent.name} failed to respond:`, err);
      }
    }
  } catch (error) {
    console.error('Error triggering agent responses:', error);
  }
}
