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
import { eq } from "drizzle-orm";
import { processDiaryWithAI } from "~/lib/server/ai/prompts";
import { generateImage } from "~/lib/server/ai/fal";
import { generateAudio } from "~/lib/server/ai/elevenlabs";
import { uploadFromBuffer, uploadFromUrl } from "~/lib/server/storage";

export const diaryRouter = createTRPCRouter({
  processEntry: protectedProcedure
    .input(z.object({ diaryEntryId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // 1. Fetch diary entry and user settings
      const entry = await ctx.db.query.diaryEntries.findFirst({
        where: eq(diaryEntries.id, input.diaryEntryId),
      });

      if (!entry) throw new Error("Diary entry not found");
      if (entry.userId !== ctx.session.user.id) throw new Error("Unauthorized");
      if (entry.processed) throw new Error("Entry already processed");

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
