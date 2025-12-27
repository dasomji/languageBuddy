import { z } from "zod";
import { generateStructuredJSON } from "./openrouter";

export const DiaryProcessingResultSchema = z.object({
  miniStory: z.object({
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
  }),
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

export type DiaryProcessingResult = z.infer<typeof DiaryProcessingResultSchema>;

export function getCombinedPrompt(
  diaryEntry: string,
  targetLanguage: string,
  level: string,
  imageStyle = "children book watercolors",
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
3. Extract ALL unique words from the translated story except for proper names. 
   - DO NOT limit yourself to nouns. Extract verbs (in their inflected form from the text), adjectives, adverbs, conjunctions, etc.
   - For each word:
     - word: the word as it appears in the story.
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
       - Use background color "${backgroundColor}".

Diary Entry:
"""
${diaryEntry}
"""

Return the result as a single JSON object with the following structure:
{
  "miniStory": {
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
  },
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
  const { imageStyle, backgroundColor, retries = 2 } = options ?? {};
  const prompt = getCombinedPrompt(
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
      const validated = DiaryProcessingResultSchema.parse(result);
      return validated;
    } catch (error) {
      console.error(`Attempt ${i + 1} failed:`, error);
      lastError = error;
    }
  }

  const errorMessage =
    lastError instanceof Error ? lastError.message : "Unknown error";
  throw new Error(
    `Failed to process diary after ${retries + 1} attempts: ${errorMessage}`,
  );
}
