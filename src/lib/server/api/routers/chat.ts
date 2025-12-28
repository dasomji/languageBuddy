import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/lib/server/api/trpc";
import {
  chatConversations,
  chatMessages,
  learningSpaces,
  userSettings,
} from "~/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import {
  generateChatResponse,
  type ChatMessage,
} from "~/lib/server/ai/openrouter";

function getChatSystemPrompt(
  targetLanguage: string,
  nativeLanguage: string,
  level: string,
  contextText: string,
): string {
  return `You are a ${targetLanguage} language teacher helping a ${nativeLanguage} speaker at ${level} level.
Answer questions directly and concisely. Do not ask follow-up questions or try to continue the conversation.
Focus on explaining grammar, vocabulary, and usage clearly.
Keep your answers short and to the point unless a detailed explanation is specifically requested.

Current context the user is studying:
"""
${contextText}
"""`;
}

export const chatRouter = createTRPCRouter({
  // Get or create a conversation for a specific context
  getOrCreateConversation: protectedProcedure
    .input(
      z.object({
        contextType: z.enum(["story", "vodex"]),
        contextId: z.string(),
        contextText: z.string(),
        forceNew: z.boolean().optional().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Get active learning space
      const settings = await ctx.db.query.userSettings.findFirst({
        where: eq(userSettings.userId, ctx.session.user.id),
      });

      const learningSpaceId = settings?.activeLearningSpaceId;

      // If not forcing new, try to find existing conversation
      if (!input.forceNew) {
        const existing = await ctx.db.query.chatConversations.findFirst({
          where: and(
            eq(chatConversations.userId, ctx.session.user.id),
            eq(chatConversations.contextType, input.contextType),
            eq(chatConversations.contextId, input.contextId),
          ),
          orderBy: desc(chatConversations.createdAt),
        });

        if (existing) {
          return existing;
        }
      }

      // Create new conversation
      const [conversation] = await ctx.db
        .insert(chatConversations)
        .values({
          userId: ctx.session.user.id,
          learningSpaceId: learningSpaceId,
          contextType: input.contextType,
          contextId: input.contextId,
          contextText: input.contextText,
        })
        .returning();

      if (!conversation) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create conversation",
        });
      }

      return conversation;
    }),

  // Send a message and get AI response
  sendMessage: protectedProcedure
    .input(
      z.object({
        conversationId: z.string().uuid(),
        content: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Get conversation
      const conversation = await ctx.db.query.chatConversations.findFirst({
        where: and(
          eq(chatConversations.id, input.conversationId),
          eq(chatConversations.userId, ctx.session.user.id),
        ),
      });

      if (!conversation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Conversation not found",
        });
      }

      // Get learning space for language info
      let targetLanguage = "French";
      let nativeLanguage = "English";
      let level = "A1";

      if (conversation.learningSpaceId) {
        const space = await ctx.db.query.learningSpaces.findFirst({
          where: eq(learningSpaces.id, conversation.learningSpaceId),
        });
        if (space) {
          targetLanguage = space.targetLanguage;
          nativeLanguage = space.nativeLanguage;
          level = space.level;
        }
      }

      // Save user message
      const [userMessage] = await ctx.db
        .insert(chatMessages)
        .values({
          conversationId: input.conversationId,
          role: "user",
          content: input.content,
        })
        .returning();

      if (!userMessage) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to save user message",
        });
      }

      // Get conversation history for context
      const history = await ctx.db.query.chatMessages.findMany({
        where: eq(chatMessages.conversationId, input.conversationId),
        orderBy: chatMessages.createdAt,
      });

      // Build messages for LLM
      const llmMessages: ChatMessage[] = history.map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      }));

      // Generate AI response
      const systemPrompt = getChatSystemPrompt(
        targetLanguage,
        nativeLanguage,
        level,
        conversation.contextText,
      );

      const aiResponse = await generateChatResponse(llmMessages, systemPrompt);

      // Save AI response
      const [assistantMessage] = await ctx.db
        .insert(chatMessages)
        .values({
          conversationId: input.conversationId,
          role: "assistant",
          content: aiResponse,
        })
        .returning();

      if (!assistantMessage) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to save assistant message",
        });
      }

      // Update conversation timestamp
      await ctx.db
        .update(chatConversations)
        .set({ updatedAt: new Date() })
        .where(eq(chatConversations.id, input.conversationId));

      return {
        userMessage,
        assistantMessage,
      };
    }),

  // Get messages for a conversation
  getMessages: protectedProcedure
    .input(z.object({ conversationId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Verify ownership
      const conversation = await ctx.db.query.chatConversations.findFirst({
        where: and(
          eq(chatConversations.id, input.conversationId),
          eq(chatConversations.userId, ctx.session.user.id),
        ),
      });

      if (!conversation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Conversation not found",
        });
      }

      const messages = await ctx.db.query.chatMessages.findMany({
        where: eq(chatMessages.conversationId, input.conversationId),
        orderBy: chatMessages.createdAt,
      });

      return { conversation, messages };
    }),

  // List all conversations for history page
  listConversations: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).optional().default(50),
        cursor: z.string().uuid().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const conversations = await ctx.db.query.chatConversations.findMany({
        where: eq(chatConversations.userId, ctx.session.user.id),
        orderBy: desc(chatConversations.updatedAt),
        limit: input.limit + 1,
      });

      let nextCursor: string | undefined = undefined;
      if (conversations.length > input.limit) {
        const nextItem = conversations.pop();
        nextCursor = nextItem?.id;
      }

      // Get first message for each conversation as preview
      const conversationsWithPreview = await Promise.all(
        conversations.map(async (conv) => {
          const firstMessage = await ctx.db.query.chatMessages.findFirst({
            where: and(
              eq(chatMessages.conversationId, conv.id),
              eq(chatMessages.role, "user"),
            ),
            orderBy: chatMessages.createdAt,
          });

          const messageCount = await ctx.db
            .select()
            .from(chatMessages)
            .where(eq(chatMessages.conversationId, conv.id));

          return {
            ...conv,
            preview: firstMessage?.content.slice(0, 100) ?? null,
            messageCount: messageCount.length,
          };
        }),
      );

      return {
        conversations: conversationsWithPreview,
        nextCursor,
      };
    }),

  // Delete a conversation
  deleteConversation: protectedProcedure
    .input(z.object({ conversationId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const conversation = await ctx.db.query.chatConversations.findFirst({
        where: and(
          eq(chatConversations.id, input.conversationId),
          eq(chatConversations.userId, ctx.session.user.id),
        ),
      });

      if (!conversation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Conversation not found",
        });
      }

      await ctx.db
        .delete(chatConversations)
        .where(eq(chatConversations.id, input.conversationId));

      return { success: true };
    }),
});

