'use client';

import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || '', {
      path: '/api/socket',
      addTrailingSlash: false,
    });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

// Socket event types
export interface ServerToClientEvents {
  'message:new': (message: {
    id: string;
    content: string;
    channelId: string;
    userId: string | null;
    agentId: string | null;
    threadId: string | null;
    createdAt: string;
    user?: { id: string; name: string | null; image: string | null };
    agent?: { id: string; name: string; avatar: string | null; type: string };
  }) => void;
  'message:typing': (data: { channelId: string; userId: string; name: string }) => void;
  'user:online': (userId: string) => void;
  'user:offline': (userId: string) => void;
}

export interface ClientToServerEvents {
  'channel:join': (channelId: string) => void;
  'channel:leave': (channelId: string) => void;
  'message:send': (data: {
    content: string;
    channelId: string;
    threadId?: string;
  }) => void;
  'message:typing': (channelId: string) => void;
}
