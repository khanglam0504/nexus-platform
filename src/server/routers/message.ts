import { z } from 'zod';
import { router, protectedProcedure } from '@/server/trpc';
import { emitNewMessage } from '@/lib/socket-emitter';
import { TRPCError } from '@trpc/server';

export const messageRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        channelId: z.string(),
        cursor: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const messages = await ctx.prisma.message.findMany({
        where: {
          channelId: input.channelId,
          threadId: null,
        },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, image: true } },
          agent: { select: { id: true, name: true, avatar: true, type: true } },
          reactions: {
            include: { user: { select: { id: true, name: true } } },
          },
          attachments: true,
          _count: { select: { replies: true } },
          needsApproval: true,
          approvedBy: true,
          approvedAt: true,
        },
      });

      let nextCursor: string | undefined;
      if (messages.length > input.limit) {
        const nextItem = messages.pop();
        nextCursor = nextItem!.id;
      }

      return { messages: messages.reverse(), nextCursor };
    }),

  getThread: protectedProcedure
    .input(z.object({ messageId: z.string() }))
    .query(async ({ ctx, input }) => {
      const parent = await ctx.prisma.message.findUnique({
        where: { id: input.messageId },
        include: {
          user: { select: { id: true, name: true, image: true } },
          agent: { select: { id: true, name: true, avatar: true, type: true } },
          reactions: {
            include: { user: { select: { id: true, name: true } } },
          },
          attachments: true,
          needsApproval: true,
        },
      });

      const replies = await ctx.prisma.message.findMany({
        where: { threadId: input.messageId },
        orderBy: { createdAt: 'asc' },
        include: {
          user: { select: { id: true, name: true, image: true } },
          agent: { select: { id: true, name: true, avatar: true, type: true } },
          reactions: {
            include: { user: { select: { id: true, name: true } } },
          },
          attachments: true,
          needsApproval: true,
        },
      });

      return { parent, replies };
    }),

  send: protectedProcedure
    .input(
      z.object({
        content: z.string().max(4000),
        channelId: z.string(),
        threadId: z.string().optional(),
        attachments: z
          .array(
            z.object({
              url: z.string(),
              name: z.string(),
              type: z.string(),
              size: z.number(),
            })
          )
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const message = await ctx.prisma.message.create({
        data: {
          content: input.content,
          channelId: input.channelId,
          userId: ctx.session.user.id,
          threadId: input.threadId,
          attachments: input.attachments
            ? {
                create: input.attachments,
              }
            : undefined,
        },
        include: {
          user: { select: { id: true, name: true, image: true } },
          attachments: true,
        },
      });

      // Emit real-time socket event
      emitNewMessage(input.channelId, {
        id: message.id,
        content: message.content,
        channelId: message.channelId,
        userId: message.userId,
        agentId: message.agentId,
        threadId: message.threadId,
        createdAt: message.createdAt.toISOString(),
        user: message.user || undefined,
      });

      return message;
    }),

  addReaction: protectedProcedure
    .input(
      z.object({
        messageId: z.string(),
        emoji: z.string().max(8),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.reaction.findUnique({
        where: {
          userId_messageId_emoji: {
            userId: ctx.session.user.id,
            messageId: input.messageId,
            emoji: input.emoji,
          },
        },
      });

      if (existing) {
        await ctx.prisma.reaction.delete({ where: { id: existing.id } });
        return { action: 'removed' };
      }

      await ctx.prisma.reaction.create({
        data: {
          emoji: input.emoji,
          userId: ctx.session.user.id,
          messageId: input.messageId,
        },
      });

      return { action: 'added' };
    }),

  // Search messages in channel
  search: protectedProcedure
    .input(
      z.object({
        channelId: z.string(),
        query: z.string().min(1).max(100),
        cursor: z.string().optional(),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const messages = await ctx.prisma.message.findMany({
        where: {
          channelId: input.channelId,
          content: { contains: input.query, mode: 'insensitive' },
        },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, image: true } },
          agent: { select: { id: true, name: true, avatar: true, type: true } },
        },
      });

      let nextCursor: string | undefined;
      if (messages.length > input.limit) {
        const nextItem = messages.pop();
        nextCursor = nextItem!.id;
      }

      return { messages, nextCursor };
    }),

  // List pinned messages
  listPinned: protectedProcedure
    .input(z.object({ channelId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.message.findMany({
        where: {
          channelId: input.channelId,
          isPinned: true,
        },
        orderBy: { pinnedAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, image: true } },
          agent: { select: { id: true, name: true, avatar: true, type: true } },
          attachments: true,
        },
      });
    }),

  // Get pinned count
  pinnedCount: protectedProcedure
    .input(z.object({ channelId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.message.count({
        where: { channelId: input.channelId, isPinned: true },
      });
    }),

  // Pin/unpin message (ADMIN+ only)
  pin: protectedProcedure
    .input(z.object({ messageId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const message = await ctx.prisma.message.findUnique({
        where: { id: input.messageId },
        include: {
          channel: {
            include: {
              workspace: {
                include: {
                  members: {
                    where: {
                      userId: ctx.session.user.id,
                      role: { in: ['OWNER', 'ADMIN'] },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!message) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      // Only OWNER/ADMIN can pin
      if (message.channel.workspace.members.length === 0) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
        });
      }

      const newPinned = !message.isPinned;
      await ctx.prisma.message.update({
        where: { id: input.messageId },
        data: {
          isPinned: newPinned,
          pinnedAt: newPinned ? new Date() : null,
          pinnedBy: newPinned ? ctx.session.user.id : null,
        },
      });

      return { isPinned: newPinned };
    }),
});
