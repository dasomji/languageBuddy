import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/lib/server/api/trpc";
import {
  diaryEntries,
  miniStories,
  miniStoryPages,
  vocabularies,
  userVocabProgress,
  userSettings,
} from "~/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { processDiaryWithAI } from "~/lib/server/ai/prompts";
import { generateImage } from "~/lib/server/ai/fal";
import { generateAudio } from "~/lib/server/ai/elevenlabs";
import { uploadFromBuffer, uploadFromUrl } from "~/lib/server/storage";

export const diaryRouter = createTRPCRouter({
  createEntry: protectedProcedure
    .input(
      z.object({
        rawText: z.string().min(1, "Diary entry cannot be empty"),
        targetLanguage: z.string().min(1, "Target language is required"),
        level: z.enum(["beginner", "A1", "A2"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Create the diary entry
      const [entry] = await ctx.db
        .insert(diaryEntries)
        .values({
          userId: ctx.session.user.id,
          rawText: input.rawText,
          targetLanguage: input.targetLanguage,
          level: input.level,
          processed: false,
        })
        .returning();

      if (!entry) {
        throw new Error("Failed to create diary entry");
      }

      // Note: AI processing should be triggered separately by the client
      // using the processEntry mutation to avoid server-side call issues

      return { entryId: entry.id };
    }),

  getEntries: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(100).default(20),
          cursor: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 20;
      const cursor = input?.cursor;

      const entries = await ctx.db.query.diaryEntries.findMany({
        where: cursor
          ? and(
              eq(diaryEntries.userId, ctx.session.user.id),
              eq(diaryEntries.processed, true),
            )
          : eq(diaryEntries.userId, ctx.session.user.id),
        orderBy: [desc(diaryEntries.createdAt)],
        limit: limit + 1,
      });

      // Get story info for each processed entry
      const entriesWithStories = await Promise.all(
        entries.map(async (entry) => {
          let story = null;
          if (entry.processed) {
            story = await ctx.db.query.miniStories.findFirst({
              where: eq(miniStories.diaryEntryId, entry.id),
            });
          }
          return { ...entry, story };
        }),
      );

      let nextCursor: typeof cursor | undefined = undefined;
      if (entries.length > limit) {
        const nextItem = entries.pop();
        nextCursor = nextItem?.id;
      }

      return {
        entries: entriesWithStories,
        nextCursor,
      };
    }),

  getEntry: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const entry = await ctx.db.query.diaryEntries.findFirst({
        where: and(
          eq(diaryEntries.id, input.id),
          eq(diaryEntries.userId, ctx.session.user.id),
        ),
      });

      if (!entry) {
        throw new Error("Diary entry not found");
      }

      return entry;
    }),

  processEntry: protectedProcedure
    .input(z.object({ diaryEntryId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // 1. Fetch diary entry and user settings
      const entry = await ctx.db.query.diaryEntries.findFirst({
        where: eq(diaryEntries.id, input.diaryEntryId),
      });

      if (!entry) throw new Error("Diary entry not found");
      if (entry.userId !== ctx.session.user.id) throw new Error("Unauthorized");

      // If already processed, clean up existing story and pages
      if (entry.processed) {
        const existingStory = await ctx.db.query.miniStories.findFirst({
          where: eq(miniStories.diaryEntryId, entry.id),
        });
        if (existingStory) {
          await ctx.db
            .delete(miniStories)
            .where(eq(miniStories.id, existingStory.id));
        }
        // Mark as unprocessed while we rerun the pipeline
        await ctx.db
          .update(diaryEntries)
          .set({ processed: false })
          .where(eq(diaryEntries.id, entry.id));
      }

      const settings = await ctx.db.query.userSettings.findFirst({
        where: eq(userSettings.userId, ctx.session.user.id),
      });

      const imageStyle = settings?.imageStyle ?? "children book watercolors";
      const backgroundColor = "#FFFFFF"; // Could come from settings in the future

      // 2. Process with AI (LLM) - Combined Prompt
      const aiResult = await processDiaryWithAI(
        entry.rawText,
        entry.targetLanguage,
        entry.level,
        { imageStyle, backgroundColor },
      );

      // 3. Create Mini-Story record
      const storyId = crypto.randomUUID();
      const coverImageKey = `stories/${storyId}/cover.png`;

      // Generate cover image
      try {
        const coverImageUrl = await generateImage({
          prompt: `${aiResult.miniStory.coverImagePrompt}, ${imageStyle}`,
        });
        await uploadFromUrl(coverImageKey, coverImageUrl, "image/png");
      } catch (err) {
        console.error("Failed to generate cover image:", err);
      }

      const [story] = await ctx.db
        .insert(miniStories)
        .values({
          id: storyId,
          userId: ctx.session.user.id,
          diaryEntryId: entry.id,
          title: aiResult.miniStory.title,
          fullTextTarget: aiResult.miniStory.textTargetLanguage,
          fullTextNative: aiResult.miniStory.textNativeLanguage,
          coverImageKey,
          languageLevel: aiResult.miniStory.languageLevel,
          originalDiaryText: aiResult.miniStory.originalText,
          fullTranslation: aiResult.miniStory.translationText,
        })
        .returning();

      if (!story) throw new Error("Failed to create mini-story");

      // 4. Process Pages (Images & Audio)
      for (const pageData of aiResult.miniStory.pages) {
        const pageId = crypto.randomUUID();
        const imageKey = `stories/${story.id}/pages/${pageId}/image.png`;
        const audioKey = `stories/${story.id}/pages/${pageId}/audio.mp3`;

        // Generate and upload assets
        try {
          const imageUrl = await generateImage({
            prompt: `${pageData.imagePrompt}, ${imageStyle}`,
          });
          await uploadFromUrl(imageKey, imageUrl, "image/png");

          const audioBuffer = await generateAudio(pageData.textTargetLanguage);
          await uploadFromBuffer(audioKey, audioBuffer, "audio/mpeg");

          // Save page
          await ctx.db.insert(miniStoryPages).values({
            id: pageId,
            miniStoryId: story.id,
            pageNumber: pageData.pageNumber,
            textTarget: pageData.textTargetLanguage,
            textNative: pageData.textNativeLanguage,
            imageKey,
            audioKey,
          });
        } catch (err) {
          console.error(`Failed to process page ${pageData.pageNumber}:`, err);
          // For now, we continue but ideally we'd have a more robust retry/cleanup
        }
      }

      // 5. Process Vocabularies
      for (const vocabData of aiResult.vocabularies) {
        // Check if vocab already exists by lemma
        let vocab = await ctx.db.query.vocabularies.findFirst({
          where: eq(vocabularies.lemma, vocabData.lemma),
        });

        if (!vocab) {
          const vocabId = crypto.randomUUID();
          const imageKey = `vocab/${vocabId}/image.png`;
          const audioKey = `vocab/${vocabId}/audio.mp3`;

          try {
            // Generate assets
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
                word: vocabData.word,
                lemma: vocabData.lemma,
                translation: vocabData.translation,
                wordKind: vocabData.kind,
                sex: vocabData.sex,
                exampleSentence: vocabData.exampleSentence,
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
          // Link to user progress
          await ctx.db
            .insert(userVocabProgress)
            .values({
              userId: ctx.session.user.id,
              vocabId: vocab.id,
            })
            .onConflictDoNothing();
        }
      }

      // 6. Mark entry as processed
      await ctx.db
        .update(diaryEntries)
        .set({ processed: true })
        .where(eq(diaryEntries.id, entry.id));

      return { storyId: story.id };
    }),
});
