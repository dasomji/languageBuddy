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
        imageStyle: "children book watercolors",
      };
    }

    return settings;
  }),

  update: protectedProcedure
    .input(
      z.object({
        audioPlaybackDelay: z.number().min(0).max(10000).optional(),
        imageStyle: z.string().min(1).optional(),
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
          })
          .returning();
      }
    }),
});

