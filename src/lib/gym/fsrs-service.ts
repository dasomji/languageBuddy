import {
  fsrs,
  generatorParameters,
  Rating,
  type Card,
  type RecordLogItem,
  type Grade,
} from "ts-fsrs";
import {
  type PracticeType,
  PRACTICE_TYPE_CONFIGS,
  BASE_XP_BY_RATING,
  type PracticeTypeConfig,
  type VocabProgress,
} from "./types";

// Initialize FSRS with default parameters
const params = generatorParameters({
  enable_fuzz: true, // add slight randomness to intervals
  enable_short_term: false, // we handle this via practice types
});

const scheduler = fsrs(params);

/**
 * Create FSRS Card from DB progress record
 */
export function createCardFromProgress(progress: VocabProgress): Card {
  return {
    difficulty: progress.difficulty,
    stability: progress.stability,
    state: progress.state,
    elapsed_days: progress.elapsedDays,
    scheduled_days: progress.scheduledDays,
    reps: progress.reps,
    lapses: progress.lapses,
    last_review: progress.lastReview ?? undefined,
    due: progress.due,
    learning_steps: 0,
  };
}

/**
 * Create a new empty card for first-time vocabulary
 */
export function createNewCard(): Card {
  return {
    difficulty: 5.0,
    stability: 0,
    state: 0, // New
    elapsed_days: 0,
    scheduled_days: 0,
    reps: 0,
    lapses: 0,
    last_review: undefined,
    due: new Date(),
    learning_steps: 0,
  };
}

/**
 * Schedule next review for a card
 */
export function scheduleReview(
  card: Card,
  rating: Grade,
  reviewDate: Date = new Date(),
): { updatedCard: Card; log: RecordLogItem } {
  const schedulingCards = scheduler.repeat(card, reviewDate);
  const result = schedulingCards[rating];

  return {
    updatedCard: result.card,
    log: result,
  };
}

/**
 * Check if card is due for review
 */
export function isDue(card: Card, now: Date = new Date()): boolean {
  return card.due <= now;
}

/**
 * Calculate XP reward based on rating and practice type
 * Higher ratings + harder practice types + higher stability = more XP
 */
export function calculateXP(
  rating: Grade,
  practiceConfig: PracticeTypeConfig,
  currentStability: number,
): number {
  const baseXP = BASE_XP_BY_RATING[rating as number] ?? 25;

  // Bonus for higher stability (mastered words worth more)
  const stabilityBonus = Math.min(currentStability / 30, 2); // max 2x at 30+ days

  // Practice type multiplier (harder exercises worth more)
  const total = Math.round(
    baseXP * practiceConfig.xpMultiplier * (1 + stabilityBonus * 0.5),
  );

  return total;
}

/**
 * Determine unlocked practice types based on stability
 */
export function getUnlockedPracticeTypes(stability: number): PracticeType[] {
  return Object.values(PRACTICE_TYPE_CONFIGS)
    .filter(
      (config) =>
        stability >= config.requiredStability && config.available === true,
    )
    .map((config) => config.type);
}

/**
 * Check if a new practice type should be unlocked
 */
export function checkForNewUnlocks(
  currentStability: number,
  currentlyUnlocked: PracticeType[],
): PracticeType[] {
  const allUnlocked = getUnlockedPracticeTypes(currentStability);
  return allUnlocked.filter((type) => !currentlyUnlocked.includes(type));
}

/**
 * Apply stability penalty when transitioning to new practice type
 * This makes the word appear more frequently until mastered in new format
 */
export function applyPracticeTypeTransition(
  currentStability: number,
  currentDifficulty: number,
): { stability: number; difficulty: number } {
  return {
    stability: currentStability * 0.6, // 40% reduction - word becomes "less stable"
    difficulty: Math.min(currentDifficulty + 0.5, 10), // slightly harder, cap at 10
  };
}

/**
 * Get recommended rating buttons based on response time and practice type
 * This helps users understand what rating to give themselves
 */
export function getRatingGuidance(
  responseTimeMs: number,
  _practiceType: PracticeType,
): {
  suggestedRating: Grade;
  guidance: string;
} {
  const quickThreshold = 3000; // 3 seconds
  const slowThreshold = 15000; // 15 seconds

  if (responseTimeMs < quickThreshold) {
    return {
      suggestedRating: Rating.Easy,
      guidance: "Quick and confident? Press Easy!",
    };
  } else if (responseTimeMs < slowThreshold) {
    return {
      suggestedRating: Rating.Good,
      guidance: "Got it after thinking? Press Good.",
    };
  } else {
    return {
      suggestedRating: Rating.Hard,
      guidance: "Struggled but remembered? Press Hard.",
    };
  }
}

/**
 * Format next review date for display
 */
export function formatNextReview(date: Date): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffMs < 0) {
    return "now";
  } else if (diffDays > 0) {
    return `in ${diffDays} day${diffDays > 1 ? "s" : ""}`;
  } else if (diffHours > 0) {
    return `in ${diffHours} hour${diffHours > 1 ? "s" : ""}`;
  } else {
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    if (diffMinutes > 0) {
      return `in ${diffMinutes} minute${diffMinutes > 1 ? "s" : ""}`;
    }
    return "soon";
  }
}

/**
 * Convert DB progress fields to VocabProgress interface
 */
export function dbProgressToVocabProgress(dbProgress: {
  difficulty: number;
  stability: number;
  state: number;
  elapsedDays: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
  lastReview: Date | null;
  due: Date;
  lastPracticeType: string | null;
  unlockedPracticeTypes: string[];
}): VocabProgress {
  return {
    difficulty: dbProgress.difficulty,
    stability: dbProgress.stability,
    state: dbProgress.state,
    elapsedDays: dbProgress.elapsedDays,
    scheduledDays: dbProgress.scheduledDays,
    reps: dbProgress.reps,
    lapses: dbProgress.lapses,
    lastReview: dbProgress.lastReview,
    due: dbProgress.due,
    lastPracticeType: dbProgress.lastPracticeType,
    unlockedPracticeTypes: dbProgress.unlockedPracticeTypes,
  };
}
