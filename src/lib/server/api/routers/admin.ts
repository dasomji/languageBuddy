import { z } from "zod";
import { eq, desc, count, and, gt } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, adminProcedure } from "~/lib/server/api/trpc";
import { user, session } from "~/db/auth-schema";
import { sendInvitationEmail, sendApprovalEmail } from "~/lib/server/email";

export const adminRouter = createTRPCRouter({
  /**
   * List all users with pagination
   */
  listUsers: adminProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
        filter: z
          .enum(["all", "waitlist", "approved", "banned", "admin"])
          .default("all"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { limit, offset, filter } = input;

      // Build where conditions based on filter
      let whereCondition;
      switch (filter) {
        case "waitlist":
          whereCondition = eq(user.waitlist, true);
          break;
        case "approved":
          whereCondition = and(
            eq(user.waitlist, false),
            eq(user.banned, false),
            eq(user.role, "user"),
          );
          break;
        case "banned":
          whereCondition = eq(user.banned, true);
          break;
        case "admin":
          whereCondition = eq(user.role, "admin");
          break;
        default:
          whereCondition = undefined;
      }

      const [users, totalResult] = await Promise.all([
        ctx.db
          .select({
            id: user.id,
            name: user.name,
            email: user.email,
            emailVerified: user.emailVerified,
            image: user.image,
            role: user.role,
            banned: user.banned,
            waitlist: user.waitlist,
            banReason: user.banReason,
            createdAt: user.createdAt,
          })
          .from(user)
          .where(whereCondition)
          .orderBy(desc(user.createdAt))
          .limit(limit)
          .offset(offset),
        ctx.db.select({ count: count() }).from(user).where(whereCondition),
      ]);

      return {
        users,
        total: totalResult[0]?.count ?? 0,
        hasMore: offset + users.length < (totalResult[0]?.count ?? 0),
      };
    }),

  /**
   * Approve a user (remove from waitlist)
   */
  approveUser: adminProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const targetUser = await ctx.db.query.user.findFirst({
        where: eq(user.id, input.userId),
      });

      if (!targetUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      await ctx.db
        .update(user)
        .set({
          waitlist: false,
        })
        .where(eq(user.id, input.userId));

      // Send approval email
      try {
        await sendApprovalEmail({
          email: targetUser.email,
          name: targetUser.name,
        });
      } catch (error) {
        console.error("Failed to send approval email:", error);
        // Don't fail the mutation if email fails
      }

      return { success: true };
    }),

  /**
   * Move a user back to the waitlist
   */
  moveToWaitlist: adminProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const targetUser = await ctx.db.query.user.findFirst({
        where: eq(user.id, input.userId),
      });

      if (!targetUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // Prevent moving admins to waitlist
      if (targetUser.role === "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot move an admin to waitlist",
        });
      }

      await ctx.db
        .update(user)
        .set({
          waitlist: true,
        })
        .where(eq(user.id, input.userId));

      return { success: true };
    }),

  /**
   * Ban a user
   */
  banUser: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        reason: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const targetUser = await ctx.db.query.user.findFirst({
        where: eq(user.id, input.userId),
      });

      if (!targetUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // Prevent banning other admins
      if (targetUser.role === "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot ban an admin user",
        });
      }

      await ctx.db
        .update(user)
        .set({
          banned: true,
          banReason: input.reason ?? "Violated terms of service",
        })
        .where(eq(user.id, input.userId));

      return { success: true };
    }),

  /**
   * Unban a user
   */
  unbanUser: adminProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const targetUser = await ctx.db.query.user.findFirst({
        where: eq(user.id, input.userId),
      });

      if (!targetUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      await ctx.db
        .update(user)
        .set({
          banned: false,
          banReason: null,
          banExpires: null,
        })
        .where(eq(user.id, input.userId));

      return { success: true };
    }),

  /**
   * Set user role (promote to admin or demote to user)
   */
  setUserRole: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        role: z.enum(["user", "admin"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const targetUser = await ctx.db.query.user.findFirst({
        where: eq(user.id, input.userId),
      });

      if (!targetUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // Prevent demoting yourself
      if (targetUser.id === ctx.session.user.id && input.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot demote yourself",
        });
      }

      await ctx.db
        .update(user)
        .set({ role: input.role })
        .where(eq(user.id, input.userId));

      return { success: true };
    }),

  /**
   * List active sessions
   */
  listSessions: adminProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { limit, offset } = input;
      const now = new Date();

      const [sessions, totalResult] = await Promise.all([
        ctx.db
          .select({
            id: session.id,
            userId: session.userId,
            expiresAt: session.expiresAt,
            createdAt: session.createdAt,
            ipAddress: session.ipAddress,
            userAgent: session.userAgent,
            userName: user.name,
            userEmail: user.email,
          })
          .from(session)
          .leftJoin(user, eq(session.userId, user.id))
          .where(gt(session.expiresAt, now))
          .orderBy(desc(session.createdAt))
          .limit(limit)
          .offset(offset),
        ctx.db
          .select({ count: count() })
          .from(session)
          .where(gt(session.expiresAt, now)),
      ]);

      return {
        sessions,
        total: totalResult[0]?.count ?? 0,
        hasMore: offset + sessions.length < (totalResult[0]?.count ?? 0),
      };
    }),

  /**
   * Send an invitation email
   */
  sendInvitation: adminProcedure
    .input(
      z.object({
        email: z.string().email(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user already exists
      const existingUser = await ctx.db.query.user.findFirst({
        where: eq(user.email, input.email),
      });

      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A user with this email already exists",
        });
      }

      // Send invitation email
      await sendInvitationEmail({
        email: input.email,
        inviterName: ctx.session.user.name ?? "The EdgeLang Team",
      });

      return { success: true };
    }),

  /**
   * Get admin dashboard stats
   */
  getStats: adminProcedure.query(async ({ ctx }) => {
    const now = new Date();

    const [
      totalUsersResult,
      waitlistUsersResult,
      approvedUsersResult,
      bannedUsersResult,
      activeSessionsResult,
    ] = await Promise.all([
      ctx.db.select({ count: count() }).from(user),
      ctx.db
        .select({ count: count() })
        .from(user)
        .where(eq(user.waitlist, true)),
      ctx.db
        .select({ count: count() })
        .from(user)
        .where(and(eq(user.waitlist, false), eq(user.banned, false))),
      ctx.db.select({ count: count() }).from(user).where(eq(user.banned, true)),
      ctx.db
        .select({ count: count() })
        .from(session)
        .where(gt(session.expiresAt, now)),
    ]);

    return {
      totalUsers: totalUsersResult[0]?.count ?? 0,
      waitlistUsers: waitlistUsersResult[0]?.count ?? 0,
      approvedUsers: approvedUsersResult[0]?.count ?? 0,
      bannedUsers: bannedUsersResult[0]?.count ?? 0,
      activeSessions: activeSessionsResult[0]?.count ?? 0,
    };
  }),
});
