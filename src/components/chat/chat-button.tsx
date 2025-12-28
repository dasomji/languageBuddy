"use client";

import { useChatContext } from "./chat-context";
import { ChatDialog } from "./chat-dialog";
import { Button } from "~/components/ui/button";
import { MessageCircle } from "lucide-react";
import { cn } from "~/lib/utils";

export function ChatButton() {
  const { context, openDialog } = useChatContext();

  // Only show when there's a context (story or vodex)
  if (!context) {
    return null;
  }

  return (
    <>
      <Button
        onClick={openDialog}
        size="icon"
        className={cn(
          "fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg",
          "bg-primary hover:bg-primary/90 text-primary-foreground",
          "transition-all duration-200 hover:scale-105",
          "animate-in fade-in slide-in-from-bottom-4 duration-300",
        )}
        aria-label="Ask a question"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
      <ChatDialog />
    </>
  );
}

