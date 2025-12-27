import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { env } from "~/env";

const elevenlabs = new ElevenLabsClient({
  apiKey: env.ELEVENLABS_API_KEY,
});

export const VOICE_ID = "JBFqnCBsd6RMkjVDRZzb";
export const TTS_MODEL = "eleven_multilingual_v2";

export async function generateAudio(text: string): Promise<Buffer> {
  try {
    const audio = await elevenlabs.textToSpeech.convert(VOICE_ID, {
      text: text,
      modelId: TTS_MODEL,
      outputFormat: "mp3_44100_128",
      voiceSettings: {
        speed: 0.7,
      },
    });

    // Convert stream to Buffer
    const reader = audio.getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
    return Buffer.concat(chunks);
  } catch (error) {
    console.error("ElevenLabs Error:", error);
    throw error;
  }
}
