import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/lib/server/api/trpc";
import { learningSpaces, userSettings } from "~/db/schema";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { ee, EVENTS } from "~/lib/server/api/events";

export const learningSpaceRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.db.query.learningSpaces.findMany({
      where: eq(learningSpaces.userId, ctx.session.user.id),
      orderBy: (learningSpaces, { desc }) => [desc(learningSpaces.createdAt)],
    });
  }),

  getActive: protectedProcedure.query(async ({ ctx }) => {
    const settings = await ctx.db.query.userSettings.findFirst({
      where: eq(userSettings.userId, ctx.session.user.id),
    });

    if (!settings?.activeLearningSpaceId) {
      return null;
    }

    const space = await ctx.db.query.learningSpaces.findFirst({
      where: and(
        eq(learningSpaces.id, settings.activeLearningSpaceId),
        eq(learningSpaces.userId, ctx.session.user.id),
      ),
    });

    return space ?? null;
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        targetLanguage: z.string().min(1),
        nativeLanguage: z.string().min(1),
        level: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [space] = await ctx.db
        .insert(learningSpaces)
        .values({
          userId: ctx.session.user.id,
          name: input.name,
          targetLanguage: input.targetLanguage,
          nativeLanguage: input.nativeLanguage,
          level: input.level,
        })
        .returning();

      if (!space) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create learning space",
        });
      }

      // If this is the first space, make it active
      const settings = await ctx.db.query.userSettings.findFirst({
        where: eq(userSettings.userId, ctx.session.user.id),
      });

      if (!settings?.activeLearningSpaceId) {
        if (settings) {
          await ctx.db
            .update(userSettings)
            .set({ activeLearningSpaceId: space.id })
            .where(eq(userSettings.userId, ctx.session.user.id));
        } else {
          await ctx.db.insert(userSettings).values({
            userId: ctx.session.user.id,
            activeLearningSpaceId: space.id,
          });
        }
      }

      return space;
    }),

  setActive: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const space = await ctx.db.query.learningSpaces.findFirst({
        where: and(
          eq(learningSpaces.id, input.id),
          eq(learningSpaces.userId, ctx.session.user.id),
        ),
      });

      if (!space) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Learning space not found",
        });
      }

      const settings = await ctx.db.query.userSettings.findFirst({
        where: eq(userSettings.userId, ctx.session.user.id),
      });

      if (settings) {
        await ctx.db
          .update(userSettings)
          .set({ activeLearningSpaceId: space.id })
          .where(eq(userSettings.userId, ctx.session.user.id));
      } else {
        await ctx.db.insert(userSettings).values({
          userId: ctx.session.user.id,
          activeLearningSpaceId: space.id,
        });
      }

      ee.emit(EVENTS.STATS_UPDATED, {
        userId: ctx.session.user.id,
        learningSpaceId: space.id,
      });

      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const space = await ctx.db.query.learningSpaces.findFirst({
        where: and(
          eq(learningSpaces.id, input.id),
          eq(learningSpaces.userId, ctx.session.user.id),
        ),
      });

      if (!space) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Learning space not found",
        });
      }

      await ctx.db
        .delete(learningSpaces)
        .where(eq(learningSpaces.id, space.id));

      // If we deleted the active space, clear it from settings
      const settings = await ctx.db.query.userSettings.findFirst({
        where: eq(userSettings.userId, ctx.session.user.id),
      });

      if (settings?.activeLearningSpaceId === space.id) {
        await ctx.db
          .update(userSettings)
          .set({ activeLearningSpaceId: null })
          .where(eq(userSettings.userId, ctx.session.user.id));
      }

      ee.emit(EVENTS.STATS_UPDATED, {
        userId: ctx.session.user.id,
        learningSpaceId: settings?.activeLearningSpaceId ?? "",
      });

      return { success: true };
    }),
});

