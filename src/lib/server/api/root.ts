import { postRouter } from "~/lib/server/api/routers/post";
import { diaryRouter } from "~/lib/server/api/routers/diary";
import { vodexRouter } from "~/lib/server/api/routers/vodex";
import { storyRouter } from "~/lib/server/api/routers/story";
import { settingsRouter } from "~/lib/server/api/routers/settings";
import { learningSpaceRouter } from "~/lib/server/api/routers/learning-space";
import { statsRouter } from "~/lib/server/api/routers/stats";
import { chatRouter } from "~/lib/server/api/routers/chat";
import { createCallerFactory, createTRPCRouter } from "~/lib/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  post: postRouter,
  diary: diaryRouter,
  vodex: vodexRouter,
  story: storyRouter,
  settings: settingsRouter,
  learningSpace: learningSpaceRouter,
  stats: statsRouter,
  chat: chatRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
