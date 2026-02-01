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
