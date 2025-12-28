import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/lib/server/api/trpc";
import {
  vocabularies,
  userVocabProgress,
  userSettings,
  vodexPackages,
  vocabToPackage,
  learningSpaces,
} from "~/db/schema";
import {
  eq,
  desc,
  and,
  like,
  or,
  sql,
  inArray,
  type SQL,
  exists,
} from "drizzle-orm";
import { generateVocabPack } from "~/lib/server/ai/prompts";
import { generateImage } from "~/lib/server/ai/fal";
import { generateAudio } from "~/lib/server/ai/elevenlabs";
import { uploadFromBuffer, uploadFromUrl } from "~/lib/server/storage";

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
          packageId: z.string().uuid().optional(),
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

      // Build conditions for vocabularies
      const vocabConditions: (SQL | undefined)[] = [
        eq(vocabularies.learningSpaceId, settings.activeLearningSpaceId),
        // Filter by user's progress record to ensure they "own" or have access to this word
        exists(
          ctx.db
            .select()
            .from(userVocabProgress)
            .where(
              and(
                eq(userVocabProgress.vocabId, vocabularies.id),
                eq(userVocabProgress.userId, ctx.session.user.id),
                eq(
                  userVocabProgress.learningSpaceId,
                  settings.activeLearningSpaceId,
                ),
              ),
            ),
        ),
      ];

      if (input?.packageId) {
        vocabConditions.push(
          exists(
            ctx.db
              .select()
              .from(vocabToPackage)
              .where(
                and(
                  eq(vocabToPackage.vocabId, vocabularies.id),
                  eq(vocabToPackage.packageId, input.packageId),
                ),
              ),
          ),
        );
      }

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

  getPackages: protectedProcedure.query(async ({ ctx }) => {
    const settings = await ctx.db.query.userSettings.findFirst({
      where: eq(userSettings.userId, ctx.session.user.id),
    });

    if (!settings?.activeLearningSpaceId) {
      return [];
    }

    return await ctx.db.query.vodexPackages.findMany({
      where: and(
        eq(vodexPackages.userId, ctx.session.user.id),
        eq(vodexPackages.learningSpaceId, settings.activeLearningSpaceId),
      ),
      orderBy: [desc(vodexPackages.createdAt)],
    });
  }),

  createPackageFromTopic: protectedProcedure
    .input(z.object({ topic: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const settings = await ctx.db.query.userSettings.findFirst({
        where: eq(userSettings.userId, ctx.session.user.id),
      });

      if (!settings?.activeLearningSpaceId) {
        throw new Error("No active learning space found");
      }

      const space = await ctx.db.query.learningSpaces.findFirst({
        where: eq(learningSpaces.id, settings.activeLearningSpaceId),
      });

      if (!space) {
        throw new Error("Active learning space not found");
      }

      const imageStyle = settings?.imageStyle ?? "children book watercolors";

      // Generate vocab pack
      const vocabResult = await generateVocabPack(
        input.topic,
        space.targetLanguage,
        space.level,
        { imageStyle, backgroundColor: "#FFFFFF" },
      );

      // Create package
      const [pack] = await ctx.db
        .insert(vodexPackages)
        .values({
          userId: ctx.session.user.id,
          learningSpaceId: space.id,
          name: input.topic,
          description: `Vocabulary pack for: ${input.topic}`,
          source: "topic",
        })
        .returning();

      if (!pack) {
        throw new Error("Failed to create package");
      }

      // Process and save vocabularies
      for (const vocabData of vocabResult.vocabularies) {
        let vocab = await ctx.db.query.vocabularies.findFirst({
          where: and(
            eq(vocabularies.lemma, vocabData.lemma),
            eq(vocabularies.learningSpaceId, space.id),
          ),
        });

        if (!vocab) {
          const vocabId = crypto.randomUUID();
          const imageKey = `vocab/${vocabId}/image.png`;
          const audioKey = `vocab/${vocabId}/audio.mp3`;

          try {
            const imageUrl = await generateImage({
              prompt: vocabData.imagePrompt,
            });
            await uploadFromUrl(imageKey, imageUrl, "image/png");

            const audioBuffer = await generateAudio(vocabData.exampleSentence);
            await uploadFromBuffer(audioKey, audioBuffer, "audio/mpeg");

            [vocab] = await ctx.db
              .insert(vocabularies)
              .values({
                id: vocabId,
                learningSpaceId: space.id,
                word: vocabData.word,
                lemma: vocabData.lemma,
                translation: vocabData.translation,
                wordKind: vocabData.kind,
                sex: vocabData.sex,
                exampleSentence: vocabData.exampleSentence,
                exampleSentenceTranslation: vocabData.exampleSentenceTranslation,
                exampleAudioKey: audioKey,
                imageKey,
              })
              .returning();
          } catch (err) {
            console.error(`Failed to process vocab ${vocabData.word}:`, err);
            continue;
          }
        }

        if (vocab) {
          // Add to user progress
          await ctx.db
            .insert(userVocabProgress)
            .values({
              userId: ctx.session.user.id,
              learningSpaceId: space.id,
              vocabId: vocab.id,
            })
            .onConflictDoNothing();

          // Link to package
          await ctx.db
            .insert(vocabToPackage)
            .values({
              vocabId: vocab.id,
              packageId: pack.id,
            })
            .onConflictDoNothing();
        }
      }

      return { packageId: pack.id };
    }),
});
