import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/lib/server/api/trpc";
import {
  diaryEntries,
  miniStories,
  userVocabProgress,
  vodexPackages,
  userSettings,
} from "~/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { observable } from "@trpc/server/observable";
import { ee, EVENTS } from "~/lib/server/api/events";

export const statsRouter = createTRPCRouter({
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const settings = await ctx.db.query.userSettings.findFirst({
      where: eq(userSettings.userId, ctx.session.user.id),
    });

    if (!settings?.activeLearningSpaceId) {
      return {
        stories: 0,
        vocabs: 0,
        diaryEntries: 0,
        wordPackages: 0,
      };
    }

    const spaceId = settings.activeLearningSpaceId;
    const userId = ctx.session.user.id;

    const [storiesCount] = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(miniStories)
      .where(and(eq(miniStories.userId, userId), eq(miniStories.learningSpaceId, spaceId)));

    const [vocabsCount] = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(userVocabProgress)
      .where(and(eq(userVocabProgress.userId, userId), eq(userVocabProgress.learningSpaceId, spaceId)));

    const [diaryEntriesCount] = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(diaryEntries)
      .where(and(eq(diaryEntries.userId, userId), eq(diaryEntries.learningSpaceId, spaceId)));

    const [wordPackagesCount] = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(vodexPackages)
      .where(and(eq(vodexPackages.userId, userId), eq(vodexPackages.learningSpaceId, spaceId)));

    return {
      stories: Number(storiesCount?.count ?? 0),
      vocabs: Number(vocabsCount?.count ?? 0),
      diaryEntries: Number(diaryEntriesCount?.count ?? 0),
      wordPackages: Number(wordPackagesCount?.count ?? 0),
    };
  }),

  getStatsSubscription: protectedProcedure.subscription(({ ctx }) => {
    return observable<{
      stories: number;
      vocabs: number;
      diaryEntries: number;
      wordPackages: number;
    }>((emit) => {
      const onStatsUpdated = async (data: { userId: string; learningSpaceId: string }) => {
        if (data.userId === ctx.session.user.id) {
          // Re-fetch stats and emit
          const spaceId = data.learningSpaceId;
          const userId = data.userId;

          const [storiesCount] = await ctx.db
            .select({ count: sql<number>`count(*)` })
            .from(miniStories)
            .where(and(eq(miniStories.userId, userId), eq(miniStories.learningSpaceId, spaceId)));

          const [vocabsCount] = await ctx.db
            .select({ count: sql<number>`count(*)` })
            .from(userVocabProgress)
            .where(and(eq(userVocabProgress.userId, userId), eq(userVocabProgress.learningSpaceId, spaceId)));

          const [diaryEntriesCount] = await ctx.db
            .select({ count: sql<number>`count(*)` })
            .from(diaryEntries)
            .where(and(eq(diaryEntries.userId, userId), eq(diaryEntries.learningSpaceId, spaceId)));

          const [wordPackagesCount] = await ctx.db
            .select({ count: sql<number>`count(*)` })
            .from(vodexPackages)
            .where(and(eq(vodexPackages.userId, userId), eq(vodexPackages.learningSpaceId, spaceId)));

          emit.next({
            stories: Number(storiesCount?.count ?? 0),
            vocabs: Number(vocabsCount?.count ?? 0),
            diaryEntries: Number(diaryEntriesCount?.count ?? 0),
            wordPackages: Number(wordPackagesCount?.count ?? 0),
          });
        }
      };

      ee.on(EVENTS.STATS_UPDATED, onStatsUpdated);
      return () => {
        ee.off(EVENTS.STATS_UPDATED, onStatsUpdated);
      };
    });
  }),
});

