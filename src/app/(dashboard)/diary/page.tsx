"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import {
  Calendar,
  Loader2,
  CheckCircle,
  Clock,
  PenLine,
  RefreshCcw,
  BookOpen,
  Languages,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Progress } from "~/components/ui/progress";

import { NoActiveSpace } from "~/components/learning-space/no-active-space";

function ProcessingIndicator({
  entryId,
  initialStatus,
  initialProgress,
  onComplete,
}: {
  entryId: string;
  initialStatus?: string | null;
  initialProgress?: number;
  onComplete: () => void;
}) {
  const [info, setInfo] = useState({
    status: initialStatus ?? "Starting...",
    progress: initialProgress ?? 0,
  });

  api.diary.processProgress.useSubscription(
    { diaryEntryId: entryId },
    {
      onData: (data) => {
        if (data.status === "error") {
          console.error("Processing error:", data.error);
        } else if (data.progress === 100) {
          onComplete();
        } else {
          setInfo({ status: data.status, progress: data.progress });
        }
      },
      onError: (err) => {
        console.error("Subscription error:", err);
      },
    },
  );

  return (
    <div className="bg-muted/50 mt-3 space-y-2 rounded-md p-3">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground flex items-center gap-2">
          <Loader2 className="h-3 w-3 animate-spin" />
          {info.status}
        </span>
        <span className="font-medium">{info.progress}%</span>
      </div>
      <Progress value={info.progress} className="h-1.5" />
    </div>
  );
}

export default function DiaryPage() {
  const router = useRouter();
  const [rawText, setRawText] = useState("");

  const { data: activeSpace, isLoading: isLoadingSpace } =
    api.learningSpace.getActive.useQuery();

  const utils = api.useUtils();

  const { data: entriesData, isLoading: isLoadingEntries } =
    api.diary.getEntries.useQuery({ limit: 20 });

  const startProcessing = api.diary.startProcessing.useMutation({
    onSuccess: () => {
      void utils.diary.getEntries.invalidate();
    },
  });

  const createEntry = api.diary.createEntry.useMutation({
    onSuccess: ({ entryId }) => {
      setRawText("");
      void utils.diary.getEntries.invalidate();
      startProcessing.mutate({ diaryEntryId: entryId, mode: "full" });
    },
    onError: (error) => {
      console.error("Failed to create entry:", error);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawText.trim() || !activeSpace) return;

    createEntry.mutate({
      rawText,
    });
  };

  if (isLoadingSpace) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!activeSpace) {
    return <NoActiveSpace />;
  }

  return (
    <div className="space-y-8 pb-24">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Daily Diary</h1>
        <p className="text-muted-foreground">
          Write about your day in your native language. We&apos;ll turn it into
          personalized learning content for your{" "}
          <span className="text-foreground font-semibold">
            {activeSpace.targetLanguage} ({activeSpace.level})
          </span>{" "}
          journey.
        </p>
      </div>

      {/* Entry Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PenLine className="h-5 w-5" />
            New Entry
          </CardTitle>
          <CardDescription>
            Writing for <strong>{activeSpace.name}</strong> (
            {activeSpace.targetLanguage} {activeSpace.level})
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="diaryEntry">Your Diary Entry</Label>
              <Textarea
                id="diaryEntry"
                placeholder="Write about your day here..."
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                className="min-h-[150px]"
              />
            </div>

            <Button
              type="submit"
              disabled={
                !rawText.trim() || createEntry.isPending || !activeSpace
              }
            >
              {createEntry.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Create Entry"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Entry List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Previous Entries
          </CardTitle>
          <CardDescription>
            Your diary entries and their processing status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingEntries ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
            </div>
          ) : entriesData?.entries.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">
              No diary entries yet. Write your first entry above!
            </p>
          ) : (
            <div className="space-y-4">
              {entriesData?.entries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex flex-col gap-2 rounded-lg border p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {entry.processed ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <Clock className="h-4 w-4 text-yellow-500" />
                      )}
                      <Badge
                        variant={entry.processed ? "default" : "secondary"}
                      >
                        {entry.processed ? "Processed" : "Processing"}
                      </Badge>
                      <Badge variant="outline">{entry.targetLanguage}</Badge>
                      <Badge variant="outline">{entry.level}</Badge>
                    </div>
                    <span className="text-muted-foreground text-xs">
                      {formatDistanceToNow(new Date(entry.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                  <p className="text-muted-foreground line-clamp-2 text-sm">
                    {entry.rawText}
                  </p>

                  {!entry.processed && entry.processingProgress < 100 && (
                    <ProcessingIndicator
                      entryId={entry.id}
                      initialStatus={entry.processingStatus}
                      initialProgress={entry.processingProgress}
                      onComplete={() => void utils.diary.getEntries.invalidate()}
                    />
                  )}

                  <div className="mt-2 flex flex-col gap-3">
                    {entry.stories && entry.stories.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {entry.stories.map((story, idx) => (
                          <Button
                            key={story.id}
                            variant="link"
                            className="text-primary flex h-auto items-center gap-1 p-0"
                            onClick={() => router.push(`/stories/${story.id}`)}
                          >
                            <BookOpen className="h-3 w-3" />
                            Story {entry.stories.length > 1 ? idx + 1 : ""}:{" "}
                            {story.title}
                          </Button>
                        ))}
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-2 border-t pt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-primary flex h-8 items-center gap-2 px-2"
                        onClick={() =>
                          startProcessing.mutate({
                            diaryEntryId: entry.id,
                            mode: "full",
                          })
                        }
                        disabled={startProcessing.isPending}
                      >
                        {startProcessing.isPending &&
                        startProcessing.variables?.diaryEntryId === entry.id &&
                        startProcessing.variables?.mode === "full" ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <RefreshCcw className="h-3 w-3" />
                        )}
                        <span className="text-xs font-medium">
                          Full Pipeline
                        </span>
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-primary flex h-8 items-center gap-2 px-2"
                        onClick={() =>
                          startProcessing.mutate({
                            diaryEntryId: entry.id,
                            mode: "story",
                          })
                        }
                        disabled={startProcessing.isPending}
                      >
                        {startProcessing.isPending &&
                        startProcessing.variables?.diaryEntryId === entry.id &&
                        startProcessing.variables?.mode === "story" ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <BookOpen className="h-3 w-3" />
                        )}
                        <span className="text-xs font-medium">
                          New Story Only
                        </span>
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-primary flex h-8 items-center gap-2 px-2"
                        onClick={() =>
                          startProcessing.mutate({
                            diaryEntryId: entry.id,
                            mode: "vocab",
                          })
                        }
                        disabled={startProcessing.isPending}
                      >
                        {startProcessing.isPending &&
                        startProcessing.variables?.diaryEntryId === entry.id &&
                        startProcessing.variables?.mode === "vocab" ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Languages className="h-3 w-3" />
                        )}
                        <span className="text-xs font-medium">
                          Regen Vocab Only
                        </span>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
