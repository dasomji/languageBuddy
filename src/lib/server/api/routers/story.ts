import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/lib/server/api/trpc";
import { miniStories, miniStoryPages } from "~/db/schema";
import { eq, desc, and, asc } from "drizzle-orm";

export const storyRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        cursor: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 20;
      const cursor = input?.cursor;

      const stories = await ctx.db.query.miniStories.findMany({
        where: eq(miniStories.userId, ctx.session.user.id),
        orderBy: [desc(miniStories.createdAt)],
        limit: limit + 1,
      });

      let nextCursor: string | undefined = undefined;
      if (stories.length > limit) {
        const nextItem = stories.pop();
        nextCursor = nextItem?.id;
      }

      return {
        stories,
        nextCursor,
      };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const story = await ctx.db.query.miniStories.findFirst({
        where: and(
          eq(miniStories.id, input.id),
          eq(miniStories.userId, ctx.session.user.id)
        ),
      });

      if (!story) {
        throw new Error("Story not found");
      }

      const pages = await ctx.db.query.miniStoryPages.findMany({
        where: eq(miniStoryPages.miniStoryId, story.id),
        orderBy: [asc(miniStoryPages.pageNumber)],
      });

      return { ...story, pages };
    }),

  updateProgress: protectedProcedure
    .input(
      z.object({
        storyId: z.string().uuid(),
        currentPage: z.number().min(1),
        completed: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const story = await ctx.db.query.miniStories.findFirst({
        where: and(
          eq(miniStories.id, input.storyId),
          eq(miniStories.userId, ctx.session.user.id)
        ),
      });

      if (!story) {
        throw new Error("Story not found");
      }

      const updateData: {
        currentPage: number;
        lastOpenedAt: Date;
        openCount: number;
        readCount?: number;
      } = {
        currentPage: input.currentPage,
        lastOpenedAt: new Date(),
        openCount: (story.openCount ?? 0) + 1,
      };

      if (input.completed) {
        updateData.readCount = (story.readCount ?? 0) + 1;
      }

      await ctx.db
        .update(miniStories)
        .set(updateData)
        .where(eq(miniStories.id, input.storyId));

      return { success: true };
    }),

  getStats: protectedProcedure.query(async ({ ctx }) => {
    const stories = await ctx.db.query.miniStories.findMany({
      where: eq(miniStories.userId, ctx.session.user.id),
    });

    const totalReads = stories.reduce((sum, s) => sum + (s.readCount ?? 0), 0);
    const totalOpens = stories.reduce((sum, s) => sum + (s.openCount ?? 0), 0);
    const completedStories = stories.filter((s) => (s.readCount ?? 0) > 0).length;

    return {
      totalStories: stories.length,
      totalReads,
      totalOpens,
      completedStories,
    };
  }),
});

