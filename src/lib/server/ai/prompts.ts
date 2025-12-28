import { z } from "zod";
import { generateStructuredJSON } from "./openrouter";

export const MiniStoryResultSchema = z.object({
  title: z.string(),
  textTargetLanguage: z.string(),
  textNativeLanguage: z.string(),
  coverImagePrompt: z.string(),
  originalText: z.string(),
  translationText: z.string(),
  languageLevel: z.string(),
  pages: z.array(
    z.object({
      pageNumber: z.number(),
      textTargetLanguage: z.string(),
      textNativeLanguage: z.string(),
      imagePrompt: z.string(),
    }),
  ),
});

export type MiniStoryResult = z.infer<typeof MiniStoryResultSchema>;

export const VocabExtractionResultSchema = z.object({
  vocabularies: z.array(
    z.object({
      word: z.string(),
      lemma: z.string(),
      translation: z.string(),
      kind: z.string(),
      sex: z.enum(["masculine", "feminine", "neuter", "none"]),
      exampleSentence: z.string(),
      exampleSentenceTranslation: z.string(),
      imagePrompt: z.string(),
    }),
  ),
});

export type VocabExtractionResult = z.infer<typeof VocabExtractionResultSchema>;

// Keeping for backward compatibility or if needed
export const DiaryProcessingResultSchema = z.object({
  miniStory: MiniStoryResultSchema,
  vocabularies: VocabExtractionResultSchema.shape.vocabularies,
});

export type DiaryProcessingResult = z.infer<typeof DiaryProcessingResultSchema>;

export function getStoryPrompt(
  diaryEntry: string,
  targetLanguage: string,
  level: string,
  imageStyle = "style: watercolors",
  backgroundColor = "#FFFFFF",
) {
  return `
You are an expert language teacher and storyteller.
I will provide you with a diary entry. Your task is to:
1. Translate it into ${targetLanguage}, simplifying the structure for level "${level}".
2. Turn this translation into a children's book-style story (Mini-Story).
   - Break it into pages, each with max 2 sentences.
   - For each page, create a descriptive image prompt in the style: "${imageStyle}".
   - Ensure the image prompts are consistent and have a "${backgroundColor}" background.

Diary Entry:
"""
${diaryEntry}
"""

Return the result as a single JSON object with the following structure:
{
  "title": "string",
  "textTargetLanguage": "string",
  "textNativeLanguage": "string",
  "coverImagePrompt": "string",
  "originalText": "string",
  "translationText": "string",
  "languageLevel": "string",
  "pages": [
    { "pageNumber": number, "textTargetLanguage": "string", "textNativeLanguage": "string", "imagePrompt": "string" }
  ]
}
  `.trim();
}

export function getVocabExtractionPrompt(
  translatedText: string,
  targetLanguage: string,
  imageStyle = "style: watercolors",
  backgroundColor = "#FFFFFF",
) {
  return `
You are an expert language teacher.
I will provide you with a text in ${targetLanguage}. Your task is to extract ALL unique words from the text except for proper names.
- DO NOT limit yourself to nouns. Extract verbs (in their inflected form from the text), adjectives, adverbs, conjunctions, etc.
- For each word:
  - word: the word as it appears in the story (with an article if applicable).
  - lemma: the base form of the word (e.g., "mangeons" -> "manger").
  - translation: translation into the user's native language.
  - kind: part of speech (noun, verb, adjective, adverb, etc.).
  - sex: for nouns, specify "masculine", "feminine", or "neuter". Otherwise use "none".
  - exampleSentence: a simple, separate example sentence using the word.
  - exampleSentenceTranslation: translation of the example sentence.
  - imagePrompt: a mnemonic-cued image prompt for the word:
    - Fire-themed for masculine words.
    - Ice-themed for feminine words.
    - Neutral/Educational for others.
    - Use style "${imageStyle}".
    - Use background color "${backgroundColor}".

Text:
"""
${translatedText}
"""

Return the result as a single JSON object with the following structure:
{
  "vocabularies": [
    {
      "word": "string",
      "lemma": "string",
      "translation": "string",
      "kind": "string",
      "sex": "masculine | feminine | neuter | none",
      "exampleSentence": "string",
      "exampleSentenceTranslation": "string",
      "imagePrompt": "string"
    }
  ]
}
  `.trim();
}

export function getVocabPackPrompt(
  topic: string,
  targetLanguage: string,
  level: string,
  imageStyle = "style: watercolors",
  backgroundColor = "#FFFFFF",
) {
  return `
You are an expert language teacher.
I will provide you with a topic or a description of what I'm interested in learning. Your task is to generate between 20 and 30 unique, highly relevant vocabulary words for that topic in ${targetLanguage} at language level "${level}".
- Include a variety of parts of speech: nouns, verbs, adjectives, etc.
- For each word:
  - word: the word (with an article if it's a noun, e.g., "la pomme").
  - lemma: the dictionary form (e.g., "manger").
  - translation: translation into English.
  - kind: part of speech (noun, verb, adjective, adverb, etc.).
  - sex: for nouns, specify "masculine", "feminine", or "neuter". Otherwise use "none".
  - exampleSentence: a simple, separate example sentence using the word at level "${level}".
  - exampleSentenceTranslation: translation of the example sentence.
  - imagePrompt: a mnemonic-cued image prompt for the word:
    - Fire-themed for masculine words.
    - Ice-themed for feminine words.
    - Neutral/Educational for others.
    - Use style "${imageStyle}".
    - Use background color "${backgroundColor}".

Topic:
"""
${topic}
"""

Return the result as a single JSON object with the following structure:
{
  "vocabularies": [
    {
      "word": "string",
      "lemma": "string",
      "translation": "string",
      "kind": "string",
      "sex": "masculine | feminine | neuter | none",
      "exampleSentence": "string",
      "exampleSentenceTranslation": "string",
      "imagePrompt": "string"
    }
  ]
}
  `.trim();
}

export async function generateMiniStory(
  diaryEntry: string,
  targetLanguage: string,
  level: string,
  options?: {
    imageStyle?: string;
    backgroundColor?: string;
    retries?: number;
  },
): Promise<MiniStoryResult> {
  const { imageStyle, backgroundColor, retries = 2 } = options ?? {};
  const prompt = getStoryPrompt(
    diaryEntry,
    targetLanguage,
    level,
    imageStyle,
    backgroundColor,
  );

  let lastError: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      const result = await generateStructuredJSON<unknown>(prompt);
      const validated = MiniStoryResultSchema.parse(result);
      return validated;
    } catch (error) {
      console.error(`Attempt ${i + 1} for MiniStory failed:`, error);
      lastError = error;
    }
  }

  throw new Error(
    `Failed to generate mini-story after ${retries + 1} attempts: ${lastError instanceof Error ? lastError.message : "Unknown error"}`,
  );
}

export async function extractVocabularies(
  translatedText: string,
  targetLanguage: string,
  options?: {
    imageStyle?: string;
    backgroundColor?: string;
    retries?: number;
  },
): Promise<VocabExtractionResult> {
  const { imageStyle, backgroundColor, retries = 2 } = options ?? {};
  const prompt = getVocabExtractionPrompt(
    translatedText,
    targetLanguage,
    imageStyle,
    backgroundColor,
  );

  let lastError: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      const result = await generateStructuredJSON<unknown>(prompt);
      const validated = VocabExtractionResultSchema.parse(result);
      return validated;
    } catch (error) {
      console.error(`Attempt ${i + 1} for VocabExtraction failed:`, error);
      lastError = error;
    }
  }

  throw new Error(
    `Failed to extract vocabularies after ${retries + 1} attempts: ${lastError instanceof Error ? lastError.message : "Unknown error"}`,
  );
}

export async function generateVocabPack(
  topic: string,
  targetLanguage: string,
  level: string,
  options?: {
    imageStyle?: string;
    backgroundColor?: string;
    retries?: number;
  },
): Promise<VocabExtractionResult> {
  const { imageStyle, backgroundColor, retries = 2 } = options ?? {};
  const prompt = getVocabPackPrompt(
    topic,
    targetLanguage,
    level,
    imageStyle,
    backgroundColor,
  );

  let lastError: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      const result = await generateStructuredJSON<unknown>(prompt);
      const validated = VocabExtractionResultSchema.parse(result);
      return validated;
    } catch (error) {
      console.error(`Attempt ${i + 1} for VocabPack generation failed:`, error);
      lastError = error;
    }
  }

  throw new Error(
    `Failed to generate vocabulary pack after ${retries + 1} attempts: ${lastError instanceof Error ? lastError.message : "Unknown error"}`,
  );
}

/** @deprecated Use generateMiniStory and extractVocabularies separately */
export async function processDiaryWithAI(
  diaryEntry: string,
  targetLanguage: string,
  level: string,
  options?: {
    imageStyle?: string;
    backgroundColor?: string;
    retries?: number;
  },
): Promise<DiaryProcessingResult> {
  const miniStory = await generateMiniStory(
    diaryEntry,
    targetLanguage,
    level,
    options,
  );
  const vocabularies = await extractVocabularies(
    miniStory.textTargetLanguage,
    targetLanguage,
    options,
  );

  return {
    miniStory,
    vocabularies: vocabularies.vocabularies,
  };
}
