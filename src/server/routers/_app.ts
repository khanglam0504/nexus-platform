import { router } from '@/server/trpc';
import { authRouter } from './auth';
import { workspaceRouter } from './workspace';
import { channelRouter } from './channel';
import { messageRouter } from './message';
import { agentRouter } from './agent';

export const appRouter = router({
  auth: authRouter,
  workspace: workspaceRouter,
  channel: channelRouter,
  message: messageRouter,
  agent: agentRouter,
});

export type AppRouter = typeof appRouter;
