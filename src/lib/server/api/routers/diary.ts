import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/lib/server/api/trpc";
import {
  diaryEntries,
  miniStories,
  miniStoryPages,
  vocabularies,
  userVocabProgress,
  userSettings,
  learningSpaces,
  vodexPackages,
  vocabToPackage,
} from "~/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import {
  generateMiniStory,
  extractVocabularies,
} from "~/lib/server/ai/prompts";
import { generateImage } from "~/lib/server/ai/fal";
import { generateAudio } from "~/lib/server/ai/elevenlabs";
import { uploadFromBuffer, uploadFromUrl } from "~/lib/server/storage";
import { observable } from "@trpc/server/observable";
import { EventEmitter } from "events";

// Global event emitter for progress updates
const ee = new EventEmitter();

// Track currently running processes to avoid duplicates
const activeProcesses = new Set<string>();

export const diaryRouter = createTRPCRouter({
  createEntry: protectedProcedure
    .input(
      z.object({
        rawText: z.string().min(1, "Diary entry cannot be empty"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Get active learning space
      const settings = await ctx.db.query.userSettings.findFirst({
        where: eq(userSettings.userId, ctx.session.user.id),
      });

      if (!settings?.activeLearningSpaceId) {
        throw new Error(
          "No active learning space found. Please create or select one.",
        );
      }

      const space = await ctx.db.query.learningSpaces.findFirst({
        where: and(
          eq(learningSpaces.id, settings.activeLearningSpaceId),
          eq(learningSpaces.userId, ctx.session.user.id),
        ),
      });

      if (!space) {
        throw new Error("Active learning space not found.");
      }

      // Create the diary entry
      const [entry] = await ctx.db
        .insert(diaryEntries)
        .values({
          userId: ctx.session.user.id,
          learningSpaceId: space.id,
          rawText: input.rawText,
          targetLanguage: space.targetLanguage,
          level: space.level,
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

      // Get active space
      const settings = await ctx.db.query.userSettings.findFirst({
        where: eq(userSettings.userId, ctx.session.user.id),
      });

      if (!settings?.activeLearningSpaceId) {
        return { entries: [], nextCursor: undefined };
      }

      const entries = await ctx.db.query.diaryEntries.findMany({
        where: cursor
          ? and(
              eq(diaryEntries.userId, ctx.session.user.id),
              eq(diaryEntries.learningSpaceId, settings.activeLearningSpaceId),
              eq(diaryEntries.processed, true),
            )
          : and(
              eq(diaryEntries.userId, ctx.session.user.id),
              eq(diaryEntries.learningSpaceId, settings.activeLearningSpaceId),
            ),
        orderBy: [desc(diaryEntries.createdAt)],
        limit: limit + 1,
      });

      // Get story info for each processed entry
      const entriesWithStories = await Promise.all(
        entries.map(async (entry) => {
          let stories: (typeof miniStories.$inferSelect)[] = [];
          if (entry.processed) {
            stories = await ctx.db.query.miniStories.findMany({
              where: eq(miniStories.diaryEntryId, entry.id),
              orderBy: [desc(miniStories.createdAt)],
            });
          }
          return { ...entry, stories };
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

  startProcessing: protectedProcedure
    .input(
      z.object({
        diaryEntryId: z.string().uuid(),
        mode: z.enum(["full", "vocab", "story"]).default("full"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const processId = `${input.diaryEntryId}-${input.mode}`;
      if (activeProcesses.has(processId)) {
        return { status: "already_processing" };
      }

      // Start background process
      const run = async () => {
        activeProcesses.add(processId);
        try {
          const updateProgress = async (
            status: string,
            progress: number,
            extra = {},
          ) => {
            await ctx.db
              .update(diaryEntries)
              .set({
                processingStatus: status,
                processingProgress: progress,
              })
              .where(eq(diaryEntries.id, input.diaryEntryId));

            ee.emit("progress", {
              diaryEntryId: input.diaryEntryId,
              status,
              progress,
              ...extra,
            });
          };

          // 1. Fetch diary entry and user settings
          await updateProgress("Fetching entry data...", 5);
          const entry = await ctx.db.query.diaryEntries.findFirst({
            where: eq(diaryEntries.id, input.diaryEntryId),
          });

          if (!entry) throw new Error("Diary entry not found");
          if (entry.userId !== ctx.session.user.id)
            throw new Error("Unauthorized");

          const settings = await ctx.db.query.userSettings.findFirst({
            where: eq(userSettings.userId, ctx.session.user.id),
          });

          const imageStyle =
            settings?.imageStyle ?? "children book watercolors";
          const backgroundColor = "#FFFFFF";

          let storyId = "";
          let translatedTextForVocab = entry.rawText; // Fallback

          // If mode is vocab only, try to find an existing story to extract vocab from
          if (input.mode === "vocab") {
            const existingStory = await ctx.db.query.miniStories.findFirst({
              where: eq(miniStories.diaryEntryId, entry.id),
              orderBy: [desc(miniStories.createdAt)],
            });
            if (existingStory) {
              translatedTextForVocab = existingStory.fullTextTarget;
              storyId = existingStory.id;
            }
          }

          // 2. Process Mini-Story (Stage 1)
          if (input.mode === "full" || input.mode === "story") {
            await updateProgress("Generating story with AI...", 15);
            const miniStoryResult = await generateMiniStory(
              entry.rawText,
              entry.targetLanguage,
              entry.level,
              { imageStyle, backgroundColor },
            );

            translatedTextForVocab = miniStoryResult.textTargetLanguage;
            storyId = crypto.randomUUID();
            const coverImageKey = `stories/${storyId}/cover.png`;

            await updateProgress("Generating cover image...", 30);
            try {
              const coverImageUrl = await generateImage({
                prompt: `${miniStoryResult.coverImagePrompt}, ${imageStyle}`,
              });
              await uploadFromUrl(coverImageKey, coverImageUrl, "image/png");
            } catch (err) {
              console.error("Failed to generate cover image:", err);
            }

            await updateProgress("Saving story to database...", 40);
            const [story] = await ctx.db
              .insert(miniStories)
              .values({
                id: storyId,
                userId: ctx.session.user.id,
                learningSpaceId: entry.learningSpaceId,
                diaryEntryId: entry.id,
                title: miniStoryResult.title,
                fullTextTarget: miniStoryResult.textTargetLanguage,
                fullTextNative: miniStoryResult.textNativeLanguage,
                coverImageKey,
                languageLevel: miniStoryResult.languageLevel,
                originalDiaryText: miniStoryResult.originalText,
                fullTranslation: miniStoryResult.translationText,
              })
              .returning();

            if (!story) throw new Error("Failed to create mini-story");

            const totalPages = miniStoryResult.pages.length;
            for (const [idx, pageData] of miniStoryResult.pages.entries()) {
              const pageProgress =
                40 + Math.floor(((idx + 1) / totalPages) * 20);
              await updateProgress(
                `Processing page ${idx + 1} of ${totalPages}...`,
                pageProgress,
              );

              const pageId = crypto.randomUUID();
              const imageKey = `stories/${story.id}/pages/${pageId}/image.png`;
              const audioKey = `stories/${story.id}/pages/${pageId}/audio.mp3`;

              try {
                const imageUrl = await generateImage({
                  prompt: `${pageData.imagePrompt}, ${imageStyle}`,
                });
                await uploadFromUrl(imageKey, imageUrl, "image/png");

                const audioBuffer = await generateAudio(
                  pageData.textTargetLanguage,
                );
                await uploadFromBuffer(audioKey, audioBuffer, "audio/mpeg");

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
                console.error(
                  `Failed to process page ${pageData.pageNumber}:`,
                  err,
                );
              }
            }
          }

          // 3. Process Vocabularies (Stage 2)
          if (input.mode === "full" || input.mode === "vocab") {
            await updateProgress("Extracting vocabularies with AI...", 65);
            const vocabResult = await extractVocabularies(
              translatedTextForVocab,
              entry.targetLanguage,
              { backgroundColor },
            );

            console.log(
              `[Vocab] Extracted ${vocabResult.vocabularies.length} words from AI: ${vocabResult.vocabularies.map((v) => v.word).join(", ")}`,
            );

            // Create a package for this diary entry
            const [pack] = await ctx.db
              .insert(vodexPackages)
              .values({
                userId: ctx.session.user.id,
                learningSpaceId: entry.learningSpaceId!,
                name: `Diary: ${new Date(entry.createdAt).toLocaleDateString()}`,
                description: `Vocabulary extracted from diary entry on ${new Date(entry.createdAt).toLocaleString()}`,
                source: "diary",
                sourceId: entry.id,
                miniStoryId: storyId || null,
              })
              .returning();

            let addedCount = 0;
            let skippedCount = 0;
            const addedWords: string[] = [];
            const skippedWords: string[] = [];

            const totalVocab = vocabResult.vocabularies.length;
            for (const [idx, vocabData] of vocabResult.vocabularies.entries()) {
              const vocabProgress =
                70 + Math.floor(((idx + 1) / totalVocab) * 25);
              await updateProgress(
                `Processing vocabulary ${idx + 1} of ${totalVocab}: ${vocabData.word}`,
                vocabProgress,
              );

              let vocab = await ctx.db.query.vocabularies.findFirst({
                where: and(
                  eq(vocabularies.lemma, vocabData.lemma),
                  eq(vocabularies.learningSpaceId, entry.learningSpaceId!),
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

                  const audioBuffer = await generateAudio(
                    vocabData.exampleSentence,
                  );
                  await uploadFromBuffer(audioKey, audioBuffer, "audio/mpeg");

                  [vocab] = await ctx.db
                    .insert(vocabularies)
                    .values({
                      id: vocabId,
                      learningSpaceId: entry.learningSpaceId,
                      word: vocabData.word,
                      lemma: vocabData.lemma,
                      translation: vocabData.translation,
                      wordKind: vocabData.kind,
                      sex: vocabData.sex,
                      exampleSentence: vocabData.exampleSentence,
                      exampleSentenceTranslation:
                        vocabData.exampleSentenceTranslation,
                      exampleAudioKey: audioKey,
                      imageKey,
                    })
                    .returning();
                  addedCount++;
                  addedWords.push(vocabData.word);
                } catch (err) {
                  console.error(
                    `Failed to process vocab ${vocabData.word}:`,
                    err,
                  );
                  continue;
                }
              } else {
                skippedCount++;
                skippedWords.push(vocabData.word);
              }

              if (vocab) {
                await ctx.db
                  .insert(userVocabProgress)
                  .values({
                    userId: ctx.session.user.id,
                    learningSpaceId: entry.learningSpaceId!,
                    vocabId: vocab.id,
                  })
                  .onConflictDoNothing();

                // Link vocab to the diary package
                if (pack) {
                  await ctx.db
                    .insert(vocabToPackage)
                    .values({
                      vocabId: vocab.id,
                      packageId: pack.id,
                    })
                    .onConflictDoNothing();
                }
              }
            }
            console.log(
              `[Vocab] Finished processing. Total: ${totalVocab}, Added: ${addedCount} (${addedWords.join(", ")}), Skipped: ${skippedCount} (${skippedWords.join(", ")})`,
            );
          }

          // 4. Finalize
          await updateProgress("Finalizing...", 95);
          await ctx.db
            .update(diaryEntries)
            .set({
              processed: true,
              processingStatus: "Completed",
              processingProgress: 100,
            })
            .where(eq(diaryEntries.id, entry.id));

          ee.emit("progress", {
            diaryEntryId: input.diaryEntryId,
            status: "Completed",
            progress: 100,
            storyId,
          });
        } catch (err) {
          console.error("Pipeline failed:", err);
          ee.emit("progress", {
            diaryEntryId: input.diaryEntryId,
            status: "error",
            progress: 0,
            error: err instanceof Error ? err.message : "Unknown error",
          });
        } finally {
          activeProcesses.delete(processId);
        }
      };

      void run();
      return { status: "started" };
    }),

  processProgress: protectedProcedure
    .input(z.object({ diaryEntryId: z.string().uuid() }))
    .subscription(({ input }) => {
      return observable<{
        status: string;
        progress: number;
        storyId?: string;
        error?: string;
      }>((emit) => {
        const onProgress = (data: any) => {
          if (data.diaryEntryId === input.diaryEntryId) {
            emit.next(data);
          }
        };

        ee.on("progress", onProgress);
        return () => {
          ee.off("progress", onProgress);
        };
      });
    }),

  getStats: protectedProcedure.query(async ({ ctx }) => {
    // Get active space
    const settings = await ctx.db.query.userSettings.findFirst({
      where: eq(userSettings.userId, ctx.session.user.id),
    });

    if (!settings?.activeLearningSpaceId) {
      return {
        totalEntries: 0,
      };
    }

    const [stats] = await ctx.db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(diaryEntries)
      .where(
        and(
          eq(diaryEntries.userId, ctx.session.user.id),
          eq(diaryEntries.learningSpaceId, settings.activeLearningSpaceId),
        ),
      );

    return {
      totalEntries: stats?.count ?? 0,
    };
  }),
});
