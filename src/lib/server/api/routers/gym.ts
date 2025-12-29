import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/lib/server/api/trpc";
import type { Rating } from "ts-fsrs";
import {
  practiceResults,
  userVocabProgress,
  practiceSessions,
  userSettings,
} from "~/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import {
  generateSession,
  getDueCount,
  getTotalVocabCount,
} from "~/lib/gym/session-generator";
import {
  createCardFromProgress,
  scheduleReview,
  calculateXP,
  checkForNewUnlocks,
  dbProgressToVocabProgress,
} from "~/lib/gym/fsrs-service";
import {
  PRACTICE_TYPE_CONFIGS,
  PracticeType,
} from "~/lib/gym/types";

export const gymRouter = createTRPCRouter({
  // Get count of due vocabulary
  getDueCount: protectedProcedure.query(async ({ ctx }) => {
    const settings = await ctx.db.query.userSettings.findFirst({
      where: eq(userSettings.userId, ctx.session.user.id),
    });

    if (!settings?.activeLearningSpaceId) {
      return { dueCount: 0, totalCount: 0 };
    }

    const [dueCount, totalCount] = await Promise.all([
      getDueCount(ctx.session.user.id, settings.activeLearningSpaceId),
      getTotalVocabCount(ctx.session.user.id, settings.activeLearningSpaceId),
    ]);

    return { dueCount, totalCount };
  }),

  // Start a new practice session
  startSession: protectedProcedure
    .input(
      z
        .object({
          targetCount: z.number().min(5).max(50).default(20),
        })
        .optional(),
    )
    .mutation(async ({ ctx, input }) => {
      const settings = await ctx.db.query.userSettings.findFirst({
        where: eq(userSettings.userId, ctx.session.user.id),
      });

      if (!settings?.activeLearningSpaceId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active learning space found",
        });
      }

      return await generateSession(
        ctx.session.user.id,
        settings.activeLearningSpaceId,
        input?.targetCount ?? 20,
      );
    }),

  // Submit a practice result
  submitResult: protectedProcedure
    .input(
      z.object({
        sessionId: z.string().uuid(),
        vocabId: z.string().uuid(),
        practiceType: z.string(),
        rating: z.number().min(1).max(4), // 1=Again, 2=Hard, 3=Good, 4=Easy
        userAnswer: z.string().optional(),
        correctAnswer: z.string().optional(),
        responseTimeMs: z.number(),
        promptText: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const {
        sessionId,
        vocabId,
        practiceType,
        rating,
        userAnswer,
        responseTimeMs,
        promptText,
      } = input;

      // Get active learning space
      const settings = await ctx.db.query.userSettings.findFirst({
        where: eq(userSettings.userId, ctx.session.user.id),
      });

      if (!settings?.activeLearningSpaceId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active learning space found",
        });
      }

      // 1. Get current progress
      const [progress] = await ctx.db
        .select()
        .from(userVocabProgress)
        .where(
          and(
            eq(userVocabProgress.userId, ctx.session.user.id),
            eq(userVocabProgress.vocabId, vocabId),
            eq(userVocabProgress.learningSpaceId, settings.activeLearningSpaceId),
          ),
        );

      if (!progress) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Vocabulary progress not found",
        });
      }

      // 2. Create FSRS card and schedule next review
      const vocabProgress = dbProgressToVocabProgress(progress);
      const card = createCardFromProgress(vocabProgress);
      const { updatedCard } = scheduleReview(card, rating as Rating);

      // 3. Calculate XP
      const practiceConfig =
        PRACTICE_TYPE_CONFIGS[practiceType as PracticeType] ??
        PRACTICE_TYPE_CONFIGS[PracticeType.FOREIGN_RECOGNITION];
      const xpGained = calculateXP(
        rating as Rating,
        practiceConfig,
        progress.stability,
      );

      // 4. Check for new practice type unlocks
      const currentUnlocked = (progress.unlockedPracticeTypes as PracticeType[]) ?? [];
      const newUnlocks = checkForNewUnlocks(
        updatedCard.stability,
        currentUnlocked,
      );

      // 5. Update progress
      const updatedUnlockedTypes = [
        ...currentUnlocked,
        ...newUnlocks,
      ];

      await ctx.db
        .update(userVocabProgress)
        .set({
          difficulty: updatedCard.difficulty,
          stability: updatedCard.stability,
          state: updatedCard.state,
          elapsedDays: updatedCard.elapsed_days,
          scheduledDays: updatedCard.scheduled_days,
          reps: updatedCard.reps,
          lapses: updatedCard.lapses,
          lastReview: updatedCard.last_review ?? null,
          due: updatedCard.due,
          xp: progress.xp + xpGained,
          lastPracticeType: practiceType,
          unlockedPracticeTypes: updatedUnlockedTypes,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(userVocabProgress.userId, ctx.session.user.id),
            eq(userVocabProgress.vocabId, vocabId),
            eq(userVocabProgress.learningSpaceId, settings.activeLearningSpaceId),
          ),
        );

      // 6. Record result
      await ctx.db.insert(practiceResults).values({
        sessionId,
        vocabId,
        practiceType,
        rating,
        userAnswer,
        correctAnswer: input.correctAnswer,
        responseTimeMs,
        promptText,
        xpGained,
        stabilityBefore: progress.stability,
        stabilityAfter: updatedCard.stability,
        difficultyBefore: progress.difficulty,
        difficultyAfter: updatedCard.difficulty,
      });

      // 7. Update session progress
      await ctx.db
        .update(practiceSessions)
        .set({
          completedCount: sql`${practiceSessions.completedCount} + 1`,
          totalXpGained: sql`${practiceSessions.totalXpGained} + ${xpGained}`,
        })
        .where(eq(practiceSessions.id, sessionId));

      return {
        xpGained,
        nextReview: updatedCard.due,
        newStability: updatedCard.stability,
        newDifficulty: updatedCard.difficulty,
        unlockedPracticeTypes: newUnlocks,
      };
    }),

  // Complete session
  completeSession: protectedProcedure
    .input(z.object({ sessionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Update session completion
      await ctx.db
        .update(practiceSessions)
        .set({ completedAt: new Date() })
        .where(eq(practiceSessions.id, input.sessionId));

      // Get session stats
      const results = await ctx.db
        .select()
        .from(practiceResults)
        .where(eq(practiceResults.sessionId, input.sessionId));

      const totalXp = results.reduce((sum, r) => sum + r.xpGained, 0);
      const againCount = results.filter((r) => r.rating === 1).length; // Rating.Again = 1
      const hardCount = results.filter((r) => r.rating === 2).length; // Rating.Hard = 2
      const goodCount = results.filter((r) => r.rating === 3).length; // Rating.Good = 3
      const easyCount = results.filter((r) => r.rating === 4).length; // Rating.Easy = 4

      const totalResponseTime = results.reduce(
        (sum, r) => sum + r.responseTimeMs,
        0,
      );

      return {
        completedCount: results.length,
        totalXp,
        ratingDistribution: {
          again: againCount,
          hard: hardCount,
          good: goodCount,
          easy: easyCount,
        },
        averageResponseTime:
          results.length > 0 ? totalResponseTime / results.length : 0,
      };
    }),

  // Get session stats (for viewing past sessions)
  getSessionStats: protectedProcedure
    .input(z.object({ sessionId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const session = await ctx.db.query.practiceSessions.findFirst({
        where: and(
          eq(practiceSessions.id, input.sessionId),
          eq(practiceSessions.userId, ctx.session.user.id),
        ),
      });

      if (!session) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Session not found",
        });
      }

      const results = await ctx.db
        .select()
        .from(practiceResults)
        .where(eq(practiceResults.sessionId, input.sessionId));

      return {
        session,
        results,
      };
    }),

  // Get gym overview stats
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const settings = await ctx.db.query.userSettings.findFirst({
      where: eq(userSettings.userId, ctx.session.user.id),
    });

    if (!settings?.activeLearningSpaceId) {
      return {
        totalXp: 0,
        totalSessions: 0,
        totalExercises: 0,
        dueCount: 0,
        totalVocab: 0,
      };
    }

    // Get total XP from vocab progress
    const xpResult = await ctx.db
      .select({ totalXp: sql<number>`coalesce(sum(${userVocabProgress.xp}), 0)` })
      .from(userVocabProgress)
      .where(
        and(
          eq(userVocabProgress.userId, ctx.session.user.id),
          eq(userVocabProgress.learningSpaceId, settings.activeLearningSpaceId),
        ),
      );

    // Get session count
    const sessionResult = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(practiceSessions)
      .where(
        and(
          eq(practiceSessions.userId, ctx.session.user.id),
          eq(practiceSessions.learningSpaceId, settings.activeLearningSpaceId),
        ),
      );

    // Get due and total counts
    const [dueCount, totalVocab] = await Promise.all([
      getDueCount(ctx.session.user.id, settings.activeLearningSpaceId),
      getTotalVocabCount(ctx.session.user.id, settings.activeLearningSpaceId),
    ]);

    return {
      totalXp: Number(xpResult[0]?.totalXp ?? 0),
      totalSessions: Number(sessionResult[0]?.count ?? 0),
      dueCount,
      totalVocab,
    };
  }),
});

