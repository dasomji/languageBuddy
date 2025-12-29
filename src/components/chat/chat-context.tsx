"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

export type ChatContextType = "story" | "vodex";

export interface ChatContextData {
  type: ChatContextType;
  id: string; // storyId:pageNumber for story, vocabId for vodex
  text: string; // The target language sentence/word
}

interface ChatContextValue {
  context: ChatContextData | null;
  setContext: (context: ChatContextData | null) => void;
  clearContext: () => void;
  isDialogOpen: boolean;
  openDialog: () => void;
  closeDialog: () => void;
  conversationId: string | null;
  setConversationId: (id: string | null) => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [context, setContextState] = useState<ChatContextData | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const setContext = useCallback((newContext: ChatContextData | null) => {
    setContextState((prevContext) => {
      // If context changed, reset conversation
      if (
        !newContext ||
        prevContext?.type !== newContext.type ||
        prevContext?.id !== newContext.id
      ) {
        setConversationId(null);
      }
      return newContext;
    });
  }, []);

  const clearContext = useCallback(() => {
    setContextState(null);
    setConversationId(null);
  }, []);

  const openDialog = useCallback(() => {
    setIsDialogOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setIsDialogOpen(false);
  }, []);

  return (
    <ChatContext.Provider
      value={{
        context,
        setContext,
        clearContext,
        isDialogOpen,
        openDialog,
        closeDialog,
        conversationId,
        setConversationId,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChatContext must be used within a ChatProvider");
  }
  return context;
}
