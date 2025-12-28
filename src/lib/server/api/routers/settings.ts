import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/lib/server/api/trpc";
import { userSettings } from "~/db/schema";
import { eq } from "drizzle-orm";

export const settingsRouter = createTRPCRouter({
  get: protectedProcedure.query(async ({ ctx }) => {
    const settings = await ctx.db.query.userSettings.findFirst({
      where: eq(userSettings.userId, ctx.session.user.id),
    });

    // If no settings exist, return defaults
    if (!settings) {
      return {
        audioPlaybackDelay: 1000,
        imageStyle: "style: watercolors, background: white",
        shortcutAudioForward: "d",
        shortcutAudioBack: "a",
        shortcutAudioPlayPause: " ",
        shortcutAudioStop: "s",
        shortcutStoryNext: "ArrowRight",
        shortcutStoryPrev: "ArrowLeft",
        shortcutVodexNext: "ArrowDown",
        shortcutVodexPrev: "ArrowUp",
      };
    }

    return settings;
  }),

  update: protectedProcedure
    .input(
      z.object({
        audioPlaybackDelay: z.number().min(0).max(10000).optional(),
        imageStyle: z.string().min(1).optional(),
        shortcutAudioForward: z.string().optional(),
        shortcutAudioBack: z.string().optional(),
        shortcutAudioPlayPause: z.string().optional(),
        shortcutAudioStop: z.string().optional(),
        shortcutStoryNext: z.string().optional(),
        shortcutStoryPrev: z.string().optional(),
        shortcutVodexNext: z.string().optional(),
        shortcutVodexPrev: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.userSettings.findFirst({
        where: eq(userSettings.userId, ctx.session.user.id),
      });

      if (existing) {
        return await ctx.db
          .update(userSettings)
          .set(input)
          .where(eq(userSettings.userId, ctx.session.user.id))
          .returning();
      } else {
        return await ctx.db
          .insert(userSettings)
          .values({
            userId: ctx.session.user.id,
            audioPlaybackDelay: input.audioPlaybackDelay ?? 1000,
            imageStyle: input.imageStyle ?? "children book watercolors",
            shortcutAudioForward: input.shortcutAudioForward ?? "d",
            shortcutAudioBack: input.shortcutAudioBack ?? "a",
            shortcutAudioPlayPause: input.shortcutAudioPlayPause ?? " ",
            shortcutAudioStop: input.shortcutAudioStop ?? "s",
            shortcutStoryNext: input.shortcutStoryNext ?? "ArrowRight",
            shortcutStoryPrev: input.shortcutStoryPrev ?? "ArrowLeft",
            shortcutVodexNext: input.shortcutVodexNext ?? "ArrowDown",
            shortcutVodexPrev: input.shortcutVodexPrev ?? "ArrowUp",
          })
          .returning();
      }
    }),
});
