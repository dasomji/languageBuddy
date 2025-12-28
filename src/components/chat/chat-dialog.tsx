"use client";

import { useState, useRef, useEffect } from "react";
import { api } from "~/trpc/react";
import { useChatContext } from "./chat-context";
import { ChatMessage } from "./chat-message";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Badge } from "~/components/ui/badge";
import {
  Send,
  Loader2,
  History,
  Plus,
  BookOpen,
  Library,
} from "lucide-react";
import Link from "next/link";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
}

export function ChatDialog() {
  const {
    context,
    isDialogOpen,
    closeDialog,
    conversationId,
    setConversationId,
  } = useChatContext();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const getOrCreateConversation =
    api.chat.getOrCreateConversation.useMutation();
  const sendMessage = api.chat.sendMessage.useMutation();
  const { data: messagesData } = api.chat.getMessages.useQuery(
    { conversationId: conversationId! },
    { enabled: !!conversationId },
  );

  // Load existing messages when conversation exists
  useEffect(() => {
    if (messagesData?.messages) {
      setMessages(
        messagesData.messages.map((m) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          content: m.content,
          createdAt: m.createdAt,
        })),
      );
    }
  }, [messagesData]);

  // Clear messages when context changes
  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
    }
  }, [conversationId]);

  // Auto-scroll to bottom when new messages appear
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when dialog opens
  useEffect(() => {
    if (isDialogOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isDialogOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !context || isLoading) return;

    const userInput = input.trim();
    setInput("");
    setIsLoading(true);

    try {
      // Get or create conversation if needed
      let currentConversationId = conversationId;
      if (!currentConversationId) {
        const conversation = await getOrCreateConversation.mutateAsync({
          contextType: context.type,
          contextId: context.id,
          contextText: context.text,
        });
        currentConversationId = conversation.id;
        setConversationId(conversation.id);
      }

      // Add user message to UI immediately
      const tempUserMessage: Message = {
        id: `temp-user-${Date.now()}`,
        role: "user",
        content: userInput,
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, tempUserMessage]);

      // Send message and get response
      const result = await sendMessage.mutateAsync({
        conversationId: currentConversationId,
        content: userInput,
      });

      // Replace temp message and add assistant response
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempUserMessage.id),
        {
          id: result.userMessage.id,
          role: "user",
          content: result.userMessage.content,
          createdAt: result.userMessage.createdAt,
        },
        {
          id: result.assistantMessage.id,
          role: "assistant",
          content: result.assistantMessage.content,
          createdAt: result.assistantMessage.createdAt,
        },
      ]);
    } catch (error) {
      console.error("Failed to send message:", error);
      // Remove temp message on error
      setMessages((prev) =>
        prev.filter((m) => !m.id.startsWith("temp-")),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = async () => {
    if (!context) return;

    setIsLoading(true);
    try {
      const conversation = await getOrCreateConversation.mutateAsync({
        contextType: context.type,
        contextId: context.id,
        contextText: context.text,
        forceNew: true,
      });
      setConversationId(conversation.id);
      setMessages([]);
    } catch (error) {
      console.error("Failed to create new chat:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const contextIcon =
    context?.type === "story" ? (
      <BookOpen className="h-4 w-4" />
    ) : (
      <Library className="h-4 w-4" />
    );

  return (
    <Dialog open={isDialogOpen} onOpenChange={(open) => !open && closeDialog()}>
      <DialogContent className="flex h-[85vh] max-h-[700px] flex-col sm:max-w-lg">
        <DialogHeader className="shrink-0 space-y-3">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              Ask about this{" "}
              {context?.type === "story" ? "sentence" : "word"}
            </DialogTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleNewChat}
                disabled={isLoading || !context}
                title="Start new chat"
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Link href="/chat" onClick={closeDialog}>
                <Button variant="outline" size="sm" title="View all chats">
                  <History className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
          {context && (
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="mb-1 flex items-center gap-2">
                <Badge variant="secondary" className="gap-1">
                  {contextIcon}
                  {context.type === "story" ? "Story" : "VoDex"}
                </Badge>
              </div>
              <p className="text-sm font-medium leading-relaxed">
                {context.text}
              </p>
            </div>
          )}
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
          <div className="space-y-4 py-4">
            {messages.length === 0 ? (
              <div className="text-muted-foreground py-12 text-center">
                <p className="text-sm">
                  Ask any question about the{" "}
                  {context?.type === "story" ? "sentence" : "word"} above.
                </p>
                <p className="mt-2 text-xs opacity-70">
                  e.g. &quot;Why is this verb conjugated this way?&quot;
                </p>
              </div>
            ) : (
              messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  role={message.role}
                  content={message.content}
                />
              ))
            )}
            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex gap-3">
                <div className="bg-muted text-muted-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
                <div className="bg-muted text-muted-foreground rounded-2xl px-4 py-2">
                  <p className="text-sm">Thinking...</p>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <form onSubmit={handleSubmit} className="flex shrink-0 gap-2 pt-4">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
            disabled={isLoading || !context}
            className="flex-1"
          />
          <Button
            type="submit"
            disabled={isLoading || !input.trim() || !context}
            size="icon"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

