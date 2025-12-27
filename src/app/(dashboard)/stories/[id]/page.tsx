"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { PresignedImage } from "~/components/ui/presigned-image";
import { AudioPlayer } from "~/components/ui/audio-player";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  ChevronLeft,
  ChevronRight,
  X,
  Play,
  Pause,
  CheckCircle,
  RotateCcw,
} from "lucide-react";
import { cn } from "~/lib/utils";

interface StoryReaderPageProps {
  params: Promise<{ id: string }>;
}

export default function StoryReaderPage({ params }: StoryReaderPageProps) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);

  const storyId = resolvedParams.id;
  const { data: story, isLoading } = api.story.getById.useQuery({
    id: storyId,
  });

  const { data: settings } = api.settings.get.useQuery();

  const updateProgress = api.story.updateProgress.useMutation();

  const pages = story?.pages ?? [];
  const totalPages = pages.length;
  const currentPageData = pages.find((p) => p.pageNumber === currentPage);
  const isLastPage = currentPage === totalPages;

  // Auto-play audio when page changes (if enabled)
  useEffect(() => {
    if (currentPageData?.audioKey && isPlaying) {
      // Audio will auto-play via the AudioPlayer component
    }
  }, [currentPage, currentPageData?.audioKey, isPlaying]);

  const goToPage = useCallback(
    (page: number) => {
      if (page < 1 || page > totalPages) return;

      setCurrentPage(page);
      setIsPlaying(true);

      // Update progress
      updateProgress.mutate({
        storyId: storyId,
        currentPage: page,
        completed: page === totalPages,
      });

      if (page === totalPages) {
        setShowCompletion(true);
        setIsPlaying(false);
      }
    },
    [totalPages, storyId, updateProgress]
  );

  const nextPage = useCallback(() => {
    goToPage(currentPage + 1);
  }, [currentPage, goToPage]);

  const prevPage = useCallback(() => {
    goToPage(currentPage - 1);
  }, [currentPage, goToPage]);

  const readAgain = () => {
    setShowCompletion(false);
    setCurrentPage(1);
    setIsPlaying(true);
    updateProgress.mutate({
      storyId: storyId,
      currentPage: 1,
    });
  };

  const closeStory = () => {
    router.push("/stories");
  };

  const handleWordClick = (word: string) => {
    setSelectedWord(word);
  };

  const handleAudioEnded = useCallback(() => {
    setIsPlaying(false);
  }, []);

  // Parse text into clickable words
  const renderTextWithClickableWords = (text: string) => {
    const words = text.split(/\s+/);
    return (
      <p className="text-lg leading-relaxed">
        {words.map((word, index) => {
          const cleanWord = word.replace(/[.,!?;:]/g, "");
          return (
            <span key={index} className="inline">
              <button
                type="button"
                onClick={() => handleWordClick(cleanWord)}
                className="inline-block px-1 rounded hover:bg-primary/20 transition-colors cursor-pointer"
              >
                {word}
              </button>
              {index < words.length - 1 ? " " : ""}
            </span>
          );
        })}
      </p>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading story...</p>
        </div>
      </div>
    );
  }

  if (!story) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-muted-foreground">Story not found</p>
        <Button onClick={() => router.push("/stories")}>Back to Stories</Button>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={closeStory}>
            <X className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">{story.title}</h1>
            <Badge variant="outline">{story.languageLevel}</Badge>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>
            Page {currentPage} of {totalPages}
          </span>
        </div>
      </div>

      {/* Story Content */}
      <div className="flex-1 grid gap-6 lg:grid-cols-2">
        {/* Image */}
        <div className="relative aspect-[4/3] lg:aspect-auto lg:rounded-lg overflow-hidden bg-muted">
          {currentPageData?.imageKey ? (
            <PresignedImage
              src={currentPageData.imageKey}
              alt={`Page ${currentPage} illustration`}
              className="h-full w-full object-contain"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">No image available</p>
            </div>
          )}
        </div>

        {/* Text */}
        <div className="flex flex-col justify-center space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsPlaying(!isPlaying)}
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>
              <span className="text-sm text-muted-foreground">
                {isPlaying ? "Playing" : "Paused"}
              </span>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-primary">
                {currentPageData?.textTarget}
              </h2>
              <p className="text-lg text-muted-foreground">
                {currentPageData?.textNative}
              </p>
            </div>

            <div className="prose prose-sm max-w-none">
              {currentPageData &&
                renderTextWithClickableWords(currentPageData.textTarget)}
            </div>
          </div>

          {/* Audio Player */}
          {currentPageData?.audioKey && (
            <div className="border-t pt-4">
              <AudioPlayer
                src={`/api/storage/presigned?key=${encodeURIComponent(currentPageData.audioKey)}&redirect=true`}
                autoPlay={isPlaying}
                delay={settings?.audioPlaybackDelay ?? 1000}
                onEnded={handleAudioEnded}
              />
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t">
        <Button
          variant="outline"
          onClick={prevPage}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Previous
        </Button>

        {/* Progress dots */}
        <div className="flex items-center gap-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              type="button"
              onClick={() => goToPage(page)}
              className={cn(
                "h-2 w-2 rounded-full transition-colors",
                page === currentPage
                  ? "bg-primary"
                  : page < currentPage
                  ? "bg-primary/50"
                  : "bg-muted"
              )}
            />
          ))}
        </div>

        <Button
          variant={isLastPage ? "default" : "outline"}
          onClick={isLastPage ? () => setShowCompletion(true) : nextPage}
        >
          {isLastPage ? (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              Finish
            </>
          ) : (
            <>
              Next
              <ChevronRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>

      {/* Completion Dialog */}
      <Dialog open={showCompletion} onOpenChange={setShowCompletion}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-green-500" />
              Story Complete!
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center py-4">
              <p className="text-2xl font-bold">{story.title}</p>
              <p className="text-muted-foreground">
                You&apos;ve read this story {story.readCount ?? 0} times
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-3xl font-bold">{story.readCount ?? 0}</p>
                <p className="text-sm text-muted-foreground">Total Reads</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-3xl font-bold">{totalPages}</p>
                <p className="text-sm text-muted-foreground">Pages</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={readAgain} className="flex-1">
                <RotateCcw className="mr-2 h-4 w-4" />
                Read Again
              </Button>
              <Button variant="outline" onClick={closeStory} className="flex-1">
                <X className="mr-2 h-4 w-4" />
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Word Click Dialog */}
      <Dialog open={!!selectedWord} onOpenChange={() => setSelectedWord(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedWord}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground text-center">
              Word lookup feature coming soon! For now, visit the VoDex to see
              this word&apos;s entry.
            </p>
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setSelectedWord(null)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

