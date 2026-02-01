'use client';

import { io, Socket } from 'socket.io-client';

// Socket event types for type safety
export interface ServerToClientEvents {
  'message:new': (message: MessagePayload) => void;
  'message:typing': (data: TypingPayload) => void;
  'user:online': (userId: string) => void;
  'user:offline': (userId: string) => void;
  'agent:responding': (data: AgentRespondingPayload) => void;
}

export interface ClientToServerEvents {
  'channel:join': (channelId: string) => void;
  'channel:leave': (channelId: string) => void;
  'message:typing': (channelId: string) => void;
  authenticate: (userId: string) => void;
}

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

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: TypedSocket | null = null;

// Get or create socket connection
export function getSocket(): TypedSocket {
  if (!socket) {
    const socketUrl = typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_SOCKET_URL || '';

    socket = io(socketUrl, {
      path: '/api/socketio',
      addTrailingSlash: false,
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    }) as TypedSocket;

    // Debug logging in development
    if (process.env.NODE_ENV === 'development') {
      socket.on('connect', () => {
        console.log('[Socket] Connected:', socket?.id);
      });

      socket.on('disconnect', (reason) => {
        console.log('[Socket] Disconnected:', reason);
      });

      socket.on('connect_error', (error) => {
        console.error('[Socket] Connection error:', error);
      });
    }
  }

  return socket;
}

// Disconnect and cleanup socket
export function disconnectSocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

// Check if socket is connected
export function isSocketConnected(): boolean {
  return socket?.connected ?? false;
}

// Authenticate user session
export function authenticateSocket(userId: string): void {
  const sock = getSocket();
  sock.emit('authenticate', userId);
}

// Join a channel room
export function joinChannel(channelId: string): void {
  const sock = getSocket();
  sock.emit('channel:join', channelId);
}

// Leave a channel room
export function leaveChannel(channelId: string): void {
  const sock = getSocket();
  sock.emit('channel:leave', channelId);
}

// Send typing indicator
export function sendTypingIndicator(channelId: string): void {
  const sock = getSocket();
  sock.emit('message:typing', channelId);
}
