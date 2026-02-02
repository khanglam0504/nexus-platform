import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server as SocketIOServer } from 'socket.io';
import type { Socket } from 'socket.io';

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Socket event types
interface ServerToClientEvents {
  'message:new': (message: MessagePayload) => void;
  'message:typing': (data: TypingPayload) => void;
  'user:online': (userId: string) => void;
  'user:offline': (userId: string) => void;
  'agent:responding': (data: AgentRespondingPayload) => void;
  'debate:turn': (data: DebateTurnPayload) => void;
  'debate:status': (data: DebateStatusPayload) => void;
}

interface ClientToServerEvents {
  'channel:join': (channelId: string) => void;
  'channel:leave': (channelId: string) => void;
  'message:typing': (channelId: string) => void;
  'debate:subscribe': (sessionId: string) => void;
  'debate:unsubscribe': (sessionId: string) => void;
  authenticate: (token: string) => void;
}

interface MessagePayload {
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

interface TypingPayload {
  channelId: string;
  userId: string;
  name: string;
}

interface AgentRespondingPayload {
  channelId: string;
  agentId: string;
  agentName: string;
}

interface DebateTurnPayload {
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

interface DebateStatusPayload {
  sessionId: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  title: string;
}

// Store the io instance globally for use in API routes
declare global {
  // eslint-disable-next-line no-var
  var io: SocketIOServer<ClientToServerEvents, ServerToClientEvents> | undefined;
}

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  const io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    path: '/api/socketio',
    addTrailingSlash: false,
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Store io instance globally
  global.io = io;

  // Track online users and their sockets
  const userSockets = new Map<string, Set<string>>();
  const socketUsers = new Map<string, string>();

  io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
    console.log(`Socket connected: ${socket.id}`);

    // Handle authentication
    socket.on('authenticate', (userId: string) => {
      if (!userId) return;

      socketUsers.set(socket.id, userId);

      if (!userSockets.has(userId)) {
        userSockets.set(userId, new Set());
        // User just came online
        io.emit('user:online', userId);
      }
      userSockets.get(userId)!.add(socket.id);

      console.log(`User ${userId} authenticated on socket ${socket.id}`);
    });

    // Handle channel join
    socket.on('channel:join', (channelId: string) => {
      socket.join(`channel:${channelId}`);
      console.log(`Socket ${socket.id} joined channel ${channelId}`);
    });

    // Handle channel leave
    socket.on('channel:leave', (channelId: string) => {
      socket.leave(`channel:${channelId}`);
      console.log(`Socket ${socket.id} left channel ${channelId}`);
    });

    // Handle typing indicator
    socket.on('message:typing', (channelId: string) => {
      const userId = socketUsers.get(socket.id);
      if (!userId) return;

      // Broadcast to channel except sender
      socket.to(`channel:${channelId}`).emit('message:typing', {
        channelId,
        userId,
        name: 'User', // In production, fetch from session/cache
      });
    });

    // Handle debate session subscription
    socket.on('debate:subscribe', (sessionId: string) => {
      socket.join(`debate:${sessionId}`);
      console.log(`Socket ${socket.id} subscribed to debate ${sessionId}`);
    });

    // Handle debate session unsubscription
    socket.on('debate:unsubscribe', (sessionId: string) => {
      socket.leave(`debate:${sessionId}`);
      console.log(`Socket ${socket.id} unsubscribed from debate ${sessionId}`);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      const userId = socketUsers.get(socket.id);
      if (userId) {
        const sockets = userSockets.get(userId);
        if (sockets) {
          sockets.delete(socket.id);
          if (sockets.size === 0) {
            userSockets.delete(userId);
            io.emit('user:offline', userId);
          }
        }
        socketUsers.delete(socket.id);
      }
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> Socket.io ready on path /api/socketio`);
  });
});
