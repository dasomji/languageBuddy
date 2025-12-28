"use client";

import { ChatProvider, ChatButton } from "~/components/chat";

export function ChatProviderWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ChatProvider>
      {children}
      <ChatButton />
    </ChatProvider>
  );
}

