import OpenAI from "openai";
import { env } from "~/env";

const openrouter = new OpenAI({
  apiKey: env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": "https://languagebuddy.com", // Optional, for OpenRouter rankings
    "X-Title": "LanguageBuddy", // Optional
  },
});

export const LLM_MODEL = "google/gemini-3-flash-preview";

export async function generateStructuredJSON<T>(
  prompt: string,
  systemPrompt = "You are a helpful language learning assistant. Always respond with valid JSON.",
): Promise<T> {
  try {
    const response = await openrouter.chat.completions.create({
      model: LLM_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No content received from OpenRouter");
    }

    return JSON.parse(content) as T;
  } catch (error) {
    console.error("OpenRouter Error:", error);
    throw error;
  }
}
