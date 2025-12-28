import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/lib/server/api/trpc";
import { vocabularies, userVocabProgress, userSettings } from "~/db/schema";
import { eq, desc, and, like, or, sql, inArray, type SQL } from "drizzle-orm";

export const vodexRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(100).default(20),
          cursor: z.string().optional(),
          search: z.string().optional(),
          wordKind: z.string().optional(),
          sex: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 20;

      // Get active space
      const settings = await ctx.db.query.userSettings.findFirst({
        where: eq(userSettings.userId, ctx.session.user.id),
      });

      if (!settings?.activeLearningSpaceId) {
        return { vocabularies: [], nextCursor: undefined };
      }

      // Get user's vocabulary IDs first for the active space
      const userVocabProgressRecords = await ctx.db
        .select({ vocabId: userVocabProgress.vocabId })
        .from(userVocabProgress)
        .where(
          and(
            eq(userVocabProgress.userId, ctx.session.user.id),
            eq(
              userVocabProgress.learningSpaceId,
              settings.activeLearningSpaceId,
            ),
          ),
        );

      const vocabIds = userVocabProgressRecords.map((r) => r.vocabId);

      if (vocabIds.length === 0) {
        return { vocabularies: [], nextCursor: undefined };
      }

      // Build conditions for vocabularies
      const vocabConditions: (SQL | undefined)[] = [
        inArray(vocabularies.id, vocabIds),
      ];

      if (input?.search) {
        vocabConditions.push(
          or(
            like(vocabularies.word, `%${input.search}%`),
            like(vocabularies.translation, `%${input.search}%`),
            like(vocabularies.lemma, `%${input.search}%`),
          ),
        );
      }

      if (input?.wordKind) {
        vocabConditions.push(eq(vocabularies.wordKind, input.wordKind));
      }

      if (input?.sex) {
        vocabConditions.push(eq(vocabularies.sex, input.sex));
      }

      const where = and(
        ...vocabConditions.filter((c): c is SQL => c !== undefined),
      );

      const vocabulariesList = await ctx.db.query.vocabularies.findMany({
        where,
        orderBy: [desc(vocabularies.createdAt)],
        limit: limit + 1,
      });

      let nextCursor: string | undefined = undefined;
      if (vocabulariesList.length > limit) {
        const nextItem = vocabulariesList.pop();
        nextCursor = nextItem?.id;
      }

      return {
        vocabularies: vocabulariesList,
        nextCursor,
      };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Get active space
      const settings = await ctx.db.query.userSettings.findFirst({
        where: eq(userSettings.userId, ctx.session.user.id),
      });

      if (!settings?.activeLearningSpaceId) {
        throw new Error("No active learning space found");
      }

      const vocab = await ctx.db.query.vocabularies.findFirst({
        where: and(
          eq(vocabularies.id, input.id),
          eq(vocabularies.learningSpaceId, settings.activeLearningSpaceId),
        ),
      });

      if (!vocab) {
        throw new Error("Vocabulary entry not found");
      }

      const progress = await ctx.db.query.userVocabProgress.findFirst({
        where: and(
          eq(userVocabProgress.userId, ctx.session.user.id),
          eq(userVocabProgress.vocabId, vocab.id),
          eq(userVocabProgress.learningSpaceId, settings.activeLearningSpaceId),
        ),
      });

      return { ...vocab, progress };
    }),

  getStats: protectedProcedure.query(async ({ ctx }) => {
    // Get active space
    const settings = await ctx.db.query.userSettings.findFirst({
      where: eq(userSettings.userId, ctx.session.user.id),
    });

    if (!settings?.activeLearningSpaceId) {
      return {
        totalWords: 0,
        totalXp: 0,
        wordKindDistribution: [],
      };
    }

    const totalWords = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(userVocabProgress)
      .where(
        and(
          eq(userVocabProgress.userId, ctx.session.user.id),
          eq(userVocabProgress.learningSpaceId, settings.activeLearningSpaceId),
        ),
      );

    const totalXp = await ctx.db
      .select({ xp: sql<number>`coalesce(sum(${userVocabProgress.xp}), 0)` })
      .from(userVocabProgress)
      .where(
        and(
          eq(userVocabProgress.userId, ctx.session.user.id),
          eq(userVocabProgress.learningSpaceId, settings.activeLearningSpaceId),
        ),
      );

    const wordKinds = await ctx.db
      .select({
        kind: vocabularies.wordKind,
        count: sql<number>`count(*)`,
      })
      .from(vocabularies)
      .innerJoin(
        userVocabProgress,
        and(
          eq(userVocabProgress.vocabId, vocabularies.id),
          eq(userVocabProgress.userId, ctx.session.user.id),
          eq(userVocabProgress.learningSpaceId, settings.activeLearningSpaceId),
        ),
      )
      .groupBy(vocabularies.wordKind);

    return {
      totalWords: totalWords[0]?.count ?? 0,
      totalXp: totalXp[0]?.xp ?? 0,
      wordKindDistribution: wordKinds,
    };
  }),
});
