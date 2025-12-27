"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
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
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function DiaryPage() {
  const router = useRouter();
  const [rawText, setRawText] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("French");
  const [level, setLevel] = useState<"beginner" | "A1" | "A2">("A1");

  const createEntry = api.diary.createEntry.useMutation({
    onSuccess: ({ entryId }) => {
      setRawText("");
      router.refresh();
      // Trigger AI processing
      processEntry.mutate({ diaryEntryId: entryId });
    },
    onError: (error) => {
      console.error("Failed to create entry:", error);
    },
  });

  const processEntry = api.diary.processEntry.useMutation({
    onSuccess: () => {
      router.refresh();
    },
    onError: (error) => {
      console.error("Failed to process entry:", error);
    },
  });

  const { data: entriesData, isLoading: isLoadingEntries } =
    api.diary.getEntries.useQuery({ limit: 20 });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawText.trim()) return;

    createEntry.mutate({
      rawText,
      targetLanguage,
      level,
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Daily Diary</h1>
        <p className="text-muted-foreground">
          Write about your day in your native language. We&apos;ll turn it into
          personalized learning content.
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
            Write freely in your native language. Don&apos;t worry about using the
            target language yet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="targetLanguage">Target Language</Label>
                <Select
                  value={targetLanguage}
                  onValueChange={setTargetLanguage}
                >
                  <SelectTrigger id="targetLanguage">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="French">French</SelectItem>
                    <SelectItem value="Spanish">Spanish</SelectItem>
                    <SelectItem value="German">German</SelectItem>
                    <SelectItem value="Italian">Italian</SelectItem>
                    <SelectItem value="Portuguese">Portuguese</SelectItem>
                    <SelectItem value="Japanese">Japanese</SelectItem>
                    <SelectItem value="Chinese">Chinese</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="level">Learning Level</Label>
                <Select
                  value={level}
                  onValueChange={(value) =>
                    setLevel(value as "beginner" | "A1" | "A2")
                  }
                >
                  <SelectTrigger id="level">
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Complete Beginner</SelectItem>
                    <SelectItem value="A1">A1 - Beginner</SelectItem>
                    <SelectItem value="A2">A2 - Elementary</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

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
              disabled={!rawText.trim() || createEntry.isPending}
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
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : entriesData?.entries.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
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
                      <Badge variant={entry.processed ? "default" : "secondary"}>
                        {entry.processed ? "Processed" : "Processing"}
                      </Badge>
                      <Badge variant="outline">{entry.targetLanguage}</Badge>
                      <Badge variant="outline">{entry.level}</Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(entry.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {entry.rawText}
                  </p>
                  <div className="flex items-center gap-4 mt-2">
                    {entry.story && (
                      <Button
                        variant="link"
                        className="h-auto p-0 text-primary"
                        onClick={() => router.push(`/stories/${entry.story?.id}`)}
                      >
                        Read story: {entry.story?.title}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-auto flex items-center gap-2 h-8 px-2 text-muted-foreground hover:text-primary"
                      onClick={() =>
                        processEntry.mutate({ diaryEntryId: entry.id })
                      }
                      disabled={processEntry.isPending}
                    >
                      {processEntry.isPending &&
                      processEntry.variables?.diaryEntryId === entry.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <RefreshCcw className="h-3 w-3" />
                      )}
                      <span className="text-xs font-medium">
                        {entry.processed ? "Rerun AI" : "Process Entry"}
                      </span>
                    </Button>
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

