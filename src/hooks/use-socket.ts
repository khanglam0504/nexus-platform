'use client';

import { useEffect, useCallback, useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  getSocket,
  disconnectSocket,
  authenticateSocket,
  joinChannel,
  leaveChannel,
  sendTypingIndicator,
  type MessagePayload,
  type TypingPayload,
  type AgentRespondingPayload,
} from '@/lib/socket';
import { trpc } from '@/lib/trpc';

// Hook for managing socket connection to a specific channel
export function useSocket(channelId: string | null) {
  const { data: session } = useSession();
  const utils = trpc.useUtils();
  const [isConnected, setIsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map());
  const [respondingAgent, setRespondingAgent] = useState<{ agentId: string; agentName: string } | null>(null);

  useEffect(() => {
    if (!channelId) return;

    const socket = getSocket();

    // Track connection status
    const handleConnect = () => {
      setIsConnected(true);
      // Authenticate if we have a session
      if (session?.user?.id) {
        authenticateSocket(session.user.id);
      }
      // Join the channel
      joinChannel(channelId);
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    // Handle new messages
    const handleNewMessage = (message: MessagePayload) => {
      if (message.channelId === channelId) {
        // Invalidate message list to refetch
        utils.message.list.invalidate({ channelId });

        // If it's a thread reply, also invalidate thread
        if (message.threadId) {
          utils.message.getThread.invalidate({ messageId: message.threadId });
        }

        // Clear responding agent if this is an agent message
        if (message.agentId) {
          setRespondingAgent(null);
        }
      }
    };

    // Handle typing indicators
    const handleTyping = (data: TypingPayload) => {
      if (data.channelId === channelId) {
        setTypingUsers(prev => {
          const next = new Map(prev);
          next.set(data.userId, data.name);
          return next;
        });

        // Clear typing indicator after 3 seconds
        setTimeout(() => {
          setTypingUsers(prev => {
            const next = new Map(prev);
            next.delete(data.userId);
            return next;
          });
        }, 3000);
      }
    };

    // Handle agent responding indicator
    const handleAgentResponding = (data: AgentRespondingPayload) => {
      if (data.channelId === channelId) {
        setRespondingAgent({ agentId: data.agentId, agentName: data.agentName });
      }
    };

    // Set up listeners
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('message:new', handleNewMessage);
    socket.on('message:typing', handleTyping);
    socket.on('agent:responding', handleAgentResponding);

    // If already connected, join immediately
    if (socket.connected) {
      handleConnect();
    }

    return () => {
      // Leave channel and clean up listeners
      leaveChannel(channelId);
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('message:new', handleNewMessage);
      socket.off('message:typing', handleTyping);
      socket.off('agent:responding', handleAgentResponding);
    };
  }, [channelId, session?.user?.id, utils]);

  // Send typing indicator with debounce handled externally
  const sendTyping = useCallback(() => {
    if (channelId) {
      sendTypingIndicator(channelId);
    }
  }, [channelId]);

  // Get array of typing user names
  const typingUserNames = Array.from(typingUsers.values());

  return {
    isConnected,
    sendTyping,
    typingUsers: typingUserNames,
    respondingAgent,
  };
}

// Hook for global socket connection management
export function useSocketConnection() {
  const { data: session, status } = useSession();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Don't connect if not authenticated
    if (status !== 'authenticated' || !session?.user?.id) {
      return;
    }

    const socket = getSocket();

    const handleConnect = () => {
      setIsConnected(true);
      authenticateSocket(session.user.id);
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    // If already connected, authenticate
    if (socket.connected) {
      handleConnect();
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      disconnectSocket();
    };
  }, [session?.user?.id, status]);

  return { isConnected };
}

// Hook for online users tracking
export function useOnlineUsers() {
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    const socket = getSocket();

    const handleUserOnline = (userId: string) => {
      setOnlineUsers(prev => new Set(prev).add(userId));
    };

    const handleUserOffline = (userId: string) => {
      setOnlineUsers(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    };

    socket.on('user:online', handleUserOnline);
    socket.on('user:offline', handleUserOffline);

    return () => {
      socket.off('user:online', handleUserOnline);
      socket.off('user:offline', handleUserOffline);
    };
  }, []);

  const isUserOnline = useCallback((userId: string) => onlineUsers.has(userId), [onlineUsers]);

  return { onlineUsers, isUserOnline };
}
