"use client";

import { cn } from "~/lib/utils";
import { User, Bot } from "lucide-react";
import { type ReactNode } from "react";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
}

// Parse markdown-style formatting (bold and italic)
function parseMarkdown(text: string): ReactNode[] {
  const result: ReactNode[] = [];
  let key = 0;

  // Split by newlines first to handle paragraphs
  const paragraphs = text.split("\n");

  paragraphs.forEach((paragraph, pIndex) => {
    if (pIndex > 0) {
      result.push(<br key={`br-${key++}`} />);
    }

    // Regex to match **bold**, *italic*, or plain text
    // Order matters: check ** before * to avoid conflicts
    const regex = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(paragraph)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        result.push(paragraph.slice(lastIndex, match.index));
      }

      const matchedText = match[0];

      if (matchedText.startsWith("**") && matchedText.endsWith("**")) {
        // Bold text
        result.push(
          <strong key={`bold-${key++}`} className="font-semibold">
            {matchedText.slice(2, -2)}
          </strong>,
        );
      } else if (matchedText.startsWith("*") && matchedText.endsWith("*")) {
        // Italic text
        result.push(
          <em key={`italic-${key++}`} className="italic">
            {matchedText.slice(1, -1)}
          </em>,
        );
      }

      lastIndex = match.index + matchedText.length;
    }

    // Add remaining text after last match
    if (lastIndex < paragraph.length) {
      result.push(paragraph.slice(lastIndex));
    }
  });

  return result;
}

export function ChatMessage({ role, content }: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <div
      className={cn("flex gap-3", isUser ? "flex-row-reverse" : "flex-row")}
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground",
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-2",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground",
        )}
      >
        <p className="text-sm leading-relaxed">{parseMarkdown(content)}</p>
      </div>
    </div>
  );
}

