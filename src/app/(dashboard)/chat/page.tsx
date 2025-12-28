"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { ScrollArea } from "~/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  MessageCircle,
  BookOpen,
  Library,
  Loader2,
  Trash2,
  ArrowLeft,
} from "lucide-react";
import { ChatMessage } from "~/components/chat/chat-message";
import { cn } from "~/lib/utils";

interface Conversation {
  id: string;
  contextType: string;
  contextId: string;
  contextText: string;
  createdAt: Date;
  updatedAt: Date;
  preview: string | null;
  messageCount: number;
}

export default function ChatHistoryPage() {
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] =
    useState<Conversation | null>(null);

  const {
    data: conversationsData,
    isLoading,
    refetch,
  } = api.chat.listConversations.useQuery({});

  const { data: messagesData, isLoading: isLoadingMessages } =
    api.chat.getMessages.useQuery(
      { conversationId: selectedConversationId! },
      { enabled: !!selectedConversationId },
    );

  const deleteConversation = api.chat.deleteConversation.useMutation({
    onSuccess: () => {
      void refetch();
      setDeleteDialogOpen(false);
      setConversationToDelete(null);
      if (selectedConversationId === conversationToDelete?.id) {
        setSelectedConversationId(null);
      }
    },
  });

  const handleDelete = (e: React.MouseEvent, conv: Conversation) => {
    e.stopPropagation();
    setConversationToDelete(conv);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (conversationToDelete) {
      deleteConversation.mutate({ conversationId: conversationToDelete.id });
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return "Today";
    } else if (days === 1) {
      return "Yesterday";
    } else if (days < 7) {
      return `${days} days ago`;
    } else {
      return new Date(date).toLocaleDateString();
    }
  };

  const selectedConversation = conversationsData?.conversations.find(
    (c) => c.id === selectedConversationId,
  );

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
            <MessageCircle className="h-8 w-8" />
            Chat History
          </h1>
          <p className="text-muted-foreground mt-1">
            View and revisit your past conversations with the language tutor
          </p>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 gap-6">
        {/* Conversation List */}
        <div className="flex w-full flex-col sm:w-1/3">
          <div className="bg-card flex-1 overflow-hidden rounded-xl border">
            {isLoading ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
              </div>
            ) : !conversationsData?.conversations.length ? (
              <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                <MessageCircle className="text-muted-foreground/20 mb-4 h-16 w-16" />
                <h3 className="text-muted-foreground text-lg font-medium">
                  No conversations yet
                </h3>
                <p className="text-muted-foreground mt-2 text-sm">
                  Start a conversation by clicking the chat button when viewing
                  a story or vocabulary word.
                </p>
              </div>
            ) : (
              <ScrollArea className="h-full">
                <div className="space-y-2 p-2">
                  {conversationsData.conversations.map((conv) => (
                    <div
                      key={conv.id}
                      onClick={() => setSelectedConversationId(conv.id)}
                      className={cn(
                        "hover:bg-accent/50 group cursor-pointer rounded-lg border p-3 transition-colors",
                        selectedConversationId === conv.id
                          ? "border-primary bg-accent"
                          : "bg-card border-transparent",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex items-center gap-2">
                            <Badge
                              variant="secondary"
                              className="gap-1 text-xs"
                            >
                              {conv.contextType === "story" ? (
                                <BookOpen className="h-3 w-3" />
                              ) : (
                                <Library className="h-3 w-3" />
                              )}
                              {conv.contextType === "story"
                                ? "Story"
                                : "VoDex"}
                            </Badge>
                            <span className="text-muted-foreground text-xs">
                              {formatDate(conv.updatedAt)}
                            </span>
                          </div>
                          <p className="line-clamp-2 text-sm font-medium">
                            {conv.contextText.slice(0, 100)}
                            {conv.contextText.length > 100 && "..."}
                          </p>
                          {conv.preview && (
                            <p className="text-muted-foreground mt-1 line-clamp-1 text-xs">
                              {conv.preview}
                            </p>
                          )}
                          <p className="text-muted-foreground mt-1 text-xs">
                            {conv.messageCount} messages
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                          onClick={(e) => handleDelete(e, conv)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>

        {/* Conversation Detail */}
        <div className="bg-card hidden flex-1 flex-col overflow-hidden rounded-xl border sm:flex">
          {selectedConversationId && selectedConversation ? (
            <>
              {/* Conversation Header */}
              <div className="border-b p-4">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="sm:hidden"
                    onClick={() => setSelectedConversationId(null)}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Badge variant="secondary" className="gap-1">
                    {selectedConversation.contextType === "story" ? (
                      <BookOpen className="h-3 w-3" />
                    ) : (
                      <Library className="h-3 w-3" />
                    )}
                    {selectedConversation.contextType === "story"
                      ? "Story"
                      : "VoDex"}
                  </Badge>
                  <span className="text-muted-foreground text-sm">
                    {formatDate(selectedConversation.updatedAt)}
                  </span>
                </div>
                <div className="bg-muted/50 mt-3 rounded-lg p-3">
                  <p className="text-sm font-medium">
                    {selectedConversation.contextText}
                  </p>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                {isLoadingMessages ? (
                  <div className="flex h-full items-center justify-center">
                    <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messagesData?.messages.map((message) => (
                      <ChatMessage
                        key={message.id}
                        role={message.role as "user" | "assistant"}
                        content={message.content}
                      />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center p-12 text-center">
              <MessageCircle className="text-muted-foreground/20 mb-4 h-16 w-16" />
              <h3 className="text-muted-foreground text-xl font-medium">
                Select a conversation
              </h3>
              <p className="text-muted-foreground mt-2 max-w-xs">
                Choose a conversation from the list to view its messages.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Conversation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Are you sure you want to delete this conversation? This action
              cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDelete}
                disabled={deleteConversation.isPending}
              >
                {deleteConversation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

