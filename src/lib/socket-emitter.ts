import type { Server as SocketIOServer } from 'socket.io';

// Socket event payload types
export interface MessagePayload {
  id: string;
  content: string;
  channelId: string;
  userId: string | null;
  agentId: string | null;
  threadId: string | null;
  createdAt: string;
  user?: { id: string; name: string | null; image: string | null };
  agent?: { id: string; name: string; avatar: string | null; type: string };
}

export interface TypingPayload {
  channelId: string;
  userId: string;
  name: string;
}

export interface AgentRespondingPayload {
  channelId: string;
  agentId: string;
  agentName: string;
}

// Debate event payloads
export interface DebateTurnPayload {
  sessionId: string;
  turn: {
    id: string;
    turnNumber: number;
    content: string;
    agentId: string;
    agentName: string;
    agentAvatar: string | null;
    createdAt: string;
  };
  isComplete: boolean;
}

export interface DebateStatusPayload {
  sessionId: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  title: string;
}

// Get the global socket.io instance
function getIO(): SocketIOServer | null {
  if (typeof global !== 'undefined' && global.io) {
    return global.io;
  }
  return null;
}

// Emit a new message to a channel
export function emitNewMessage(channelId: string, message: MessagePayload): void {
  const io = getIO();
  if (io) {
    io.to(`channel:${channelId}`).emit('message:new', message);
    console.log(`Emitted message:new to channel ${channelId}`);
  }
}

// Emit typing indicator
export function emitTyping(channelId: string, data: TypingPayload): void {
  const io = getIO();
  if (io) {
    io.to(`channel:${channelId}`).emit('message:typing', data);
  }
}

// Emit agent responding indicator
export function emitAgentResponding(channelId: string, data: AgentRespondingPayload): void {
  const io = getIO();
  if (io) {
    io.to(`channel:${channelId}`).emit('agent:responding', data);
  }
}

// Check if socket server is available
export function isSocketAvailable(): boolean {
  return getIO() !== null;
}

// Emit debate turn to channel
export function emitDebateTurn(channelId: string, data: DebateTurnPayload): void {
  const io = getIO();
  if (io) {
    io.to(`channel:${channelId}`).emit('debate:turn', data);
    console.log(`Emitted debate:turn to channel ${channelId}`);
  }
}

// Emit debate status change to channel
export function emitDebateStatusChange(channelId: string, data: DebateStatusPayload): void {
  const io = getIO();
  if (io) {
    io.to(`channel:${channelId}`).emit('debate:status', data);
    console.log(`Emitted debate:status to channel ${channelId}`);
  }
}
