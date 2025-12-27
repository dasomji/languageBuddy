/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment */
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/lib/server/api/trpc";
import { vocabularies, userVocabProgress } from "~/db/schema";
import { eq, desc, and, like, or, sql, inArray } from "drizzle-orm";

export const vodexRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        cursor: z.string().optional(),
        search: z.string().optional(),
        wordKind: z.string().optional(),
        sex: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 20;

      // Get user's vocabulary IDs first
      const userVocabProgressRecords = await ctx.db
        .select({ vocabId: userVocabProgress.vocabId })
        .from(userVocabProgress)
        .where(eq(userVocabProgress.userId, ctx.session.user.id));

      const vocabIds = userVocabProgressRecords.map((r) => r.vocabId);

      if (vocabIds.length === 0) {
        return { vocabularies: [], nextCursor: undefined };
      }

      // Build conditions for vocabularies
      const vocabConditions: any[] = [inArray(vocabularies.id, vocabIds)];

      if (input?.search) {
        vocabConditions.push(
          or(
            like(vocabularies.word, `%${input.search}%`),
            like(vocabularies.translation, `%${input.search}%`),
            like(vocabularies.lemma, `%${input.search}%`)
          )
        );
      }

      if (input?.wordKind) {
        vocabConditions.push(eq(vocabularies.wordKind, input.wordKind));
      }

      if (input?.sex) {
        vocabConditions.push(eq(vocabularies.sex, input.sex));
      }

      const vocabulariesList = await ctx.db.query.vocabularies.findMany({
        where: vocabConditions.length > 1 ? and(...vocabConditions) : vocabConditions[0],
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
      const vocab = await ctx.db.query.vocabularies.findFirst({
        where: eq(vocabularies.id, input.id),
        with: {
          userVocabProgresses: {
            where: eq(userVocabProgress.userId, ctx.session.user.id),
          },
        },
      });

      if (!vocab) {
        throw new Error("Vocabulary entry not found");
      }

      return vocab;
    }),

  getStats: protectedProcedure.query(async ({ ctx }) => {
    const totalWords = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(userVocabProgress)
      .where(eq(userVocabProgress.userId, ctx.session.user.id));

    const totalXp = await ctx.db
      .select({ xp: sql<number>`coalesce(sum(${userVocabProgress.xp}), 0)` })
      .from(userVocabProgress)
      .where(eq(userVocabProgress.userId, ctx.session.user.id));

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
          eq(userVocabProgress.userId, ctx.session.user.id)
        )
      )
      .groupBy(vocabularies.wordKind);

    return {
      totalWords: totalWords[0]?.count ?? 0,
      totalXp: totalXp[0]?.xp ?? 0,
      wordKindDistribution: wordKinds,
    };
  }),
});
