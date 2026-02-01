'use client';

import { useEffect, useCallback } from 'react';
import { getSocket, disconnectSocket } from '@/lib/socket';
import { trpc } from '@/lib/trpc';

export function useSocket(channelId: string | null) {
  const utils = trpc.useUtils();

  useEffect(() => {
    if (!channelId) return;

    const socket = getSocket();

    socket.emit('channel:join', channelId);

    socket.on('message:new', (message) => {
      if (message.channelId === channelId) {
        // Invalidate message list to refetch
        utils.message.list.invalidate({ channelId });

        // If it's a thread reply, also invalidate thread
        if (message.threadId) {
          utils.message.getThread.invalidate({ messageId: message.threadId });
        }
      }
    });

    return () => {
      socket.emit('channel:leave', channelId);
      socket.off('message:new');
    };
  }, [channelId, utils]);

  const sendTyping = useCallback(
    (channelId: string) => {
      const socket = getSocket();
      socket.emit('message:typing', channelId);
    },
    []
  );

  return { sendTyping };
}

export function useSocketConnection() {
  useEffect(() => {
    const socket = getSocket();

    socket.on('connect', () => {
      console.log('Socket connected');
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    return () => {
      disconnectSocket();
    };
  }, []);
}
