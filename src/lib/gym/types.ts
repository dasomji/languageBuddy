import { Rating, State } from "ts-fsrs";

// Re-export Rating and State from ts-fsrs for convenience
export { Rating, State };

/**
 * Practice Types (in order of difficulty/unlock)
 */
export enum PracticeType {
  FOREIGN_RECOGNITION = "foreign_recognition",
  ENGLISH_PROMPT = "english_prompt",
  COMBINATION_SIMPLE = "combination_simple",
  TRANSFORMER_DRILLS = "transformer_drills",
  COMBINATION_COMPLEX = "combination_complex",
  CONVERSATION = "conversation",
  FREEFLOW = "freeflow",
}

/**
 * Practice Type Configuration
 */
export interface PracticeTypeConfig {
  type: PracticeType;
  displayName: string;
  description: string;
  requiredStability: number; // days until unlocked
  difficultyWeight: number; // 0-1, affects XP calculation
  xpMultiplier: number;
  instructions: string; // User-facing instructions
  available: boolean; // Whether this practice type is implemented
}

export const PRACTICE_TYPE_CONFIGS: Record<PracticeType, PracticeTypeConfig> = {
  [PracticeType.FOREIGN_RECOGNITION]: {
    type: PracticeType.FOREIGN_RECOGNITION,
    displayName: "Recognition",
    description: "See target language → write native language",
    requiredStability: 0,
    difficultyWeight: 0.3,
    xpMultiplier: 1.0,
    instructions: "What does this word mean?",
    available: true,
  },
  [PracticeType.ENGLISH_PROMPT]: {
    type: PracticeType.ENGLISH_PROMPT,
    displayName: "Production",
    description: "See native language → write target language",
    requiredStability: 3,
    difficultyWeight: 0.5,
    xpMultiplier: 1.5,
    instructions: "How do you say this in the target language?",
    available: true,
  },
  [PracticeType.COMBINATION_SIMPLE]: {
    type: PracticeType.COMBINATION_SIMPLE,
    displayName: "Simple Combinations",
    description: "Form sentences with 2-3 words",
    requiredStability: 7,
    difficultyWeight: 0.6,
    xpMultiplier: 2.0,
    instructions: "Create a sentence using these words:",
    available: false, // Coming soon
  },
  [PracticeType.TRANSFORMER_DRILLS]: {
    type: PracticeType.TRANSFORMER_DRILLS,
    displayName: "Transformations",
    description: "Transform sentences (tense, person, etc.)",
    requiredStability: 14,
    difficultyWeight: 0.7,
    xpMultiplier: 2.5,
    instructions: "Transform this sentence:",
    available: false, // Coming soon
  },
  [PracticeType.COMBINATION_COMPLEX]: {
    type: PracticeType.COMBINATION_COMPLEX,
    displayName: "Complex Combinations",
    description: "Form sentences with 4-6 words",
    requiredStability: 30,
    difficultyWeight: 0.8,
    xpMultiplier: 3.0,
    instructions: "Create a sentence using all these words:",
    available: false, // Coming soon
  },
  [PracticeType.CONVERSATION]: {
    type: PracticeType.CONVERSATION,
    displayName: "Conversation",
    description: "Use in AI conversation",
    requiredStability: 60,
    difficultyWeight: 0.9,
    xpMultiplier: 4.0,
    instructions: "Have a conversation using this vocabulary:",
    available: false, // Coming soon
  },
  [PracticeType.FREEFLOW]: {
    type: PracticeType.FREEFLOW,
    displayName: "Freeflow Writing",
    description: "Write freely with feedback",
    requiredStability: 60,
    difficultyWeight: 0.9,
    xpMultiplier: 5.0,
    instructions: "Write freely about this topic:",
    available: false, // Coming soon
  },
};

/**
 * FSRS Rating Labels and Colors for UI
 */
export const RATING_CONFIG = {
  [Rating.Again]: {
    label: "Again",
    color: "destructive" as const,
    bgClass: "bg-red-500 hover:bg-red-600",
    description: "Forgot completely",
    shortcut: "1",
  },
  [Rating.Hard]: {
    label: "Hard",
    color: "secondary" as const,
    bgClass: "bg-orange-500 hover:bg-orange-600",
    description: "Struggled but remembered",
    shortcut: "2",
  },
  [Rating.Good]: {
    label: "Good",
    color: "default" as const,
    bgClass: "bg-green-500 hover:bg-green-600",
    description: "Remembered after thinking",
    shortcut: "3",
  },
  [Rating.Easy]: {
    label: "Easy",
    color: "default" as const,
    bgClass: "bg-blue-500 hover:bg-blue-600",
    description: "Instant recall",
    shortcut: "4",
  },
};

/**
 * Base XP rewards by rating (excluding Manual which is not used in practice)
 */
export const BASE_XP_BY_RATING: Record<number, number> = {
  1: 5, // Again - Forgot, but still trying
  2: 15, // Hard - Struggled but got it
  3: 25, // Good - Standard success
  4: 40, // Easy - Mastered
};

/**
 * Vocabulary data needed for exercises
 */
export interface VocabForExercise {
  id: string;
  word: string;
  lemma: string;
  translation: string;
  exampleSentence: string | null;
  exampleSentenceTranslation: string | null;
  wordKind: string;
  sex: string | null;
  imageKey: string | null;
  exampleAudioKey: string | null;
}

/**
 * Practice Exercise Data
 */
export interface PracticeExercise {
  vocabId: string;
  vocab: VocabForExercise;
  practiceType: PracticeType;
  order: number;
  promptText: string;
  correctAnswer: string;
  hints?: string[];
  practiceData: Record<string, unknown>;
}

/**
 * Session Generation Result
 */
export interface GeneratedSession {
  sessionId: string;
  exercises: PracticeExercise[];
  estimatedDurationMinutes: number;
}

/**
 * Result of submitting a practice exercise
 */
export interface SubmitResultResponse {
  xpGained: number;
  nextReview: Date;
  newStability: number;
  newDifficulty: number;
  unlockedPracticeTypes: PracticeType[];
}

/**
 * Session completion stats
 */
export interface SessionStats {
  completedCount: number;
  totalXp: number;
  ratingDistribution: {
    again: number;
    hard: number;
    good: number;
    easy: number;
  };
  averageResponseTime: number;
}

/**
 * User's progress on a vocabulary item (from DB)
 */
export interface VocabProgress {
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
}

