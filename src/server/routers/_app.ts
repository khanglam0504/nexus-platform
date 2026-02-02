import { router } from '@/server/trpc';
import { authRouter } from './auth';
import { workspaceRouter } from './workspace';
import { channelRouter } from './channel';
import { channelGroupRouter } from './channel-group';
import { messageRouter } from './message';
import { agentRouter } from './agent';
import { debateRouter } from './debate';

export const appRouter = router({
  auth: authRouter,
  workspace: workspaceRouter,
  channel: channelRouter,
  channelGroup: channelGroupRouter,
  message: messageRouter,
  agent: agentRouter,
  debate: debateRouter,
});

export type AppRouter = typeof appRouter;
