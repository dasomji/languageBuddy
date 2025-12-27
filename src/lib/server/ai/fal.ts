import { fal } from "@fal-ai/client";
import { env } from "~/env";

// Configure fal client
// On the server, we use the API key directly
// On the client, we use the proxy route
fal.config({
  credentials: typeof window === "undefined" ? env.FAL_AI_API_KEY : undefined,
  proxyUrl: "/api/fal/proxy",
});

export const IMAGE_MODEL = "fal-ai/z-image/turbo";

export interface GenerateImageOptions {
  prompt: string;
  image_size?:
    | "square_hd"
    | "square"
    | "portrait_4_3"
    | "portrait_16_9"
    | "landscape_4_3"
    | "landscape_16_9";
}

export async function generateImage(options: GenerateImageOptions) {
  try {
    const result = await fal.subscribe(IMAGE_MODEL, {
      input: {
        prompt: options.prompt,
        image_size: options.image_size ?? "landscape_4_3",
      },
    });

    const imageUrl = result.data?.images?.[0]?.url;
    if (!imageUrl) {
      throw new Error("No image URL received from fal-ai");
    }

    return imageUrl;
  } catch (error) {
    console.error("fal-ai Error:", error);
    throw error;
  }
}
