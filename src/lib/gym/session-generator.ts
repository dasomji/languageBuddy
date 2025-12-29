import { db } from "~/lib/server/db";
import {
  userVocabProgress,
  vocabularies,
  practiceSessions,
} from "~/db/schema";
import { and, eq, lte, sql } from "drizzle-orm";
import {
  PracticeType,
  PRACTICE_TYPE_CONFIGS,
  type PracticeExercise,
  type GeneratedSession,
  type VocabForExercise,
} from "./types";

/**
 * Generate a practice session for a user
 */
export async function generateSession(
  userId: string,
  learningSpaceId: string,
  targetCount = 20,
): Promise<GeneratedSession> {
  const now = new Date();

  // 1. Get all due vocabulary with progress
  const dueVocabs = await db
    .select({
      vocabId: userVocabProgress.vocabId,
      word: vocabularies.word,
      lemma: vocabularies.lemma,
      translation: vocabularies.translation,
      exampleSentence: vocabularies.exampleSentence,
      exampleSentenceTranslation: vocabularies.exampleSentenceTranslation,
      wordKind: vocabularies.wordKind,
      sex: vocabularies.sex,
      imageKey: vocabularies.imageKey,
      exampleAudioKey: vocabularies.exampleAudioKey,
      difficulty: userVocabProgress.difficulty,
      stability: userVocabProgress.stability,
      state: userVocabProgress.state,
      elapsedDays: userVocabProgress.elapsedDays,
      scheduledDays: userVocabProgress.scheduledDays,
      reps: userVocabProgress.reps,
      lapses: userVocabProgress.lapses,
      lastReview: userVocabProgress.lastReview,
      due: userVocabProgress.due,
      lastPracticeType: userVocabProgress.lastPracticeType,
      unlockedPracticeTypes: userVocabProgress.unlockedPracticeTypes,
    })
    .from(userVocabProgress)
    .innerJoin(vocabularies, eq(userVocabProgress.vocabId, vocabularies.id))
    .where(
      and(
        eq(userVocabProgress.userId, userId),
        eq(userVocabProgress.learningSpaceId, learningSpaceId),
        lte(userVocabProgress.due, now),
      ),
    )
    .orderBy(sql`${userVocabProgress.due} ASC`) // most overdue first
    .limit(targetCount * 2); // Get extras for variety

  if (dueVocabs.length === 0) {
    throw new Error("No vocabulary due for review. Come back later!");
  }

  // 2. Create session record
  const [session] = await db
    .insert(practiceSessions)
    .values({
      userId,
      learningSpaceId,
      targetCount,
      startedAt: now,
    })
    .returning();

  if (!session) {
    throw new Error("Failed to create practice session");
  }

  // 3. Select practice types for each vocab with variety
  const exercises: PracticeExercise[] = [];
  const recentTypes = new Set<PracticeType>();
  const selectedVocabs = dueVocabs.slice(0, targetCount);

  for (const vocab of selectedVocabs) {
    // Get practice types this vocab has unlocked (only available ones)
    const unlockedTypes = (
      (vocab.unlockedPracticeTypes as PracticeType[]) || [
        PracticeType.FOREIGN_RECOGNITION,
      ]
    ).filter((type) => PRACTICE_TYPE_CONFIGS[type]?.available === true);

    // Filter out recently used types for variety
    const availableTypes = unlockedTypes.filter(
      (type) =>
        !recentTypes.has(type) && type !== vocab.lastPracticeType,
    );

    // If all types filtered out, just use any unlocked type
    const selectedType =
      availableTypes.length > 0 ? availableTypes[0]! : unlockedTypes[0]!;

    // Generate exercise based on type
    const vocabData: VocabForExercise = {
      id: vocab.vocabId,
      word: vocab.word,
      lemma: vocab.lemma,
      translation: vocab.translation,
      exampleSentence: vocab.exampleSentence,
      exampleSentenceTranslation: vocab.exampleSentenceTranslation,
      wordKind: vocab.wordKind,
      sex: vocab.sex,
      imageKey: vocab.imageKey,
      exampleAudioKey: vocab.exampleAudioKey,
    };

    const exercise = generateExercise(vocabData, selectedType, exercises.length);
    exercises.push(exercise);

    // Track recent types (sliding window of 3)
    recentTypes.add(selectedType);
    if (recentTypes.size > 3) {
      const firstType = [...recentTypes][0];
      if (firstType) recentTypes.delete(firstType);
    }
  }

  // 4. Estimate duration (roughly 30-60 seconds per exercise)
  const avgSecondsPerExercise = 45;
  const estimatedDurationMinutes = Math.ceil(
    (exercises.length * avgSecondsPerExercise) / 60,
  );

  return {
    sessionId: session.id,
    exercises,
    estimatedDurationMinutes,
  };
}

/**
 * Generate specific exercise based on practice type
 */
function generateExercise(
  vocab: VocabForExercise,
  practiceType: PracticeType,
  order: number,
): PracticeExercise {
  switch (practiceType) {
    case PracticeType.FOREIGN_RECOGNITION:
      return {
        vocabId: vocab.id,
        vocab,
        practiceType,
        order,
        promptText: vocab.word, // Show target language word
        correctAnswer: vocab.translation, // Expect native language
        hints: vocab.exampleSentence ? [vocab.exampleSentence] : [],
        practiceData: {
          type: "recognition",
          showExample: !!vocab.exampleSentence,
        },
      };

    case PracticeType.ENGLISH_PROMPT:
      return {
        vocabId: vocab.id,
        vocab,
        practiceType,
        order,
        promptText: vocab.translation, // Show native language
        correctAnswer: vocab.word, // Expect target language
        hints: vocab.exampleSentence ? [vocab.exampleSentence] : [],
        practiceData: {
          type: "production",
          acceptVariants: true, // Accept different forms of the word
        },
      };

    case PracticeType.COMBINATION_SIMPLE:
      // For now, fall back to recognition (coming soon)
      return {
        vocabId: vocab.id,
        vocab,
        practiceType: PracticeType.FOREIGN_RECOGNITION,
        order,
        promptText: vocab.word,
        correctAnswer: vocab.translation,
        practiceData: {
          type: "recognition",
          fallbackFrom: PracticeType.COMBINATION_SIMPLE,
        },
      };

    case PracticeType.TRANSFORMER_DRILLS:
    case PracticeType.COMBINATION_COMPLEX:
    case PracticeType.CONVERSATION:
    case PracticeType.FREEFLOW:
      // Fall back to recognition for unimplemented types
      return {
        vocabId: vocab.id,
        vocab,
        practiceType: PracticeType.FOREIGN_RECOGNITION,
        order,
        promptText: vocab.word,
        correctAnswer: vocab.translation,
        practiceData: {
          type: "recognition",
          fallbackFrom: practiceType,
        },
      };

    default: {
      // Exhaustive check - this should never happen
      const _exhaustiveCheck: never = practiceType;
      throw new Error(`Practice type ${String(_exhaustiveCheck)} not implemented`);
    }
  }
}

/**
 * Get count of due vocabulary for a learning space
 */
export async function getDueCount(
  userId: string,
  learningSpaceId: string,
): Promise<number> {
  const now = new Date();

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(userVocabProgress)
    .where(
      and(
        eq(userVocabProgress.userId, userId),
        eq(userVocabProgress.learningSpaceId, learningSpaceId),
        lte(userVocabProgress.due, now),
      ),
    );

  return Number(result[0]?.count ?? 0);
}

/**
 * Get total vocabulary count for a learning space
 */
export async function getTotalVocabCount(
  userId: string,
  learningSpaceId: string,
): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(userVocabProgress)
    .where(
      and(
        eq(userVocabProgress.userId, userId),
        eq(userVocabProgress.learningSpaceId, learningSpaceId),
      ),
    );

  return Number(result[0]?.count ?? 0);
}

