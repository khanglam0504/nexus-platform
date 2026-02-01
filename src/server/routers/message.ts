import { z } from 'zod';
import { router, protectedProcedure } from '@/server/trpc';

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
          _count: { select: { replies: true } },
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
        },
      });

      const replies = await ctx.prisma.message.findMany({
        where: { threadId: input.messageId },
        orderBy: { createdAt: 'asc' },
        include: {
          user: { select: { id: true, name: true, image: true } },
          agent: { select: { id: true, name: true, avatar: true, type: true } },
        },
      });

      return { parent, replies };
    }),

  send: protectedProcedure
    .input(
      z.object({
        content: z.string().min(1).max(4000),
        channelId: z.string(),
        threadId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.message.create({
        data: {
          content: input.content,
          channelId: input.channelId,
          userId: ctx.session.user.id,
          threadId: input.threadId,
        },
        include: {
          user: { select: { id: true, name: true, image: true } },
        },
      });
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
});
