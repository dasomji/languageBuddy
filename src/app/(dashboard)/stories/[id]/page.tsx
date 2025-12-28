"use client";
import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { PresignedImage } from "~/components/ui/presigned-image";
import { AudioPlayer } from "~/components/ui/audio-player";
import { useKeyboardShortcut } from "~/hooks/use-keyboard-shortcut";
import { HeaderSetter } from "~/components/dashboard-header-context";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "~/components/ui/breadcrumb";
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
  CheckCircle,
  RotateCcw,
} from "lucide-react";

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
      });
    },
    [totalPages, storyId, updateProgress],
  );

  const handleFinish = useCallback(() => {
    updateProgress.mutate({
      storyId: storyId,
      currentPage: totalPages,
      completed: true,
    });
    setShowCompletion(true);
    setIsPlaying(false);
  }, [storyId, totalPages, updateProgress]);

  const nextPage = useCallback(() => {
    if (currentPage === totalPages) {
      handleFinish();
    } else {
      goToPage(currentPage + 1);
    }
  }, [currentPage, totalPages, goToPage, handleFinish]);

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

  // Keyboard Shortcuts for Story Navigation
  useKeyboardShortcut(
    settings?.shortcutStoryNext ?? "ArrowRight",
    nextPage,
    !!settings,
  );
  useKeyboardShortcut(
    settings?.shortcutStoryPrev ?? "ArrowLeft",
    prevPage,
    !!settings,
  );

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
                className="hover:bg-primary/20 inline-block cursor-pointer rounded px-1 transition-colors"
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
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="border-primary mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2" />
          <p className="text-muted-foreground">Loading story...</p>
        </div>
      </div>
    );
  }

  if (!story) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Story not found</p>
        <Button onClick={() => router.push("/stories")}>Back to Stories</Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <HeaderSetter>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/stories">Stories</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <div className="flex items-center gap-2">
                <BreadcrumbPage className="text-xl font-bold">
                  {story.title}
                </BreadcrumbPage>
                <Badge variant="outline">{story.languageLevel}</Badge>
              </div>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </HeaderSetter>

      {/* Story Content */}
      <div className="grid min-h-0 flex-1 gap-6 sm:grid-cols-2 lg:grid-cols-2">
        {/* Text */}
        <div className="flex min-h-0 flex-col items-center justify-center space-y-6 overflow-y-auto">
          <div className="w-full">
            <div className="w-full">
              {currentPageData &&
                renderTextWithClickableWords(currentPageData.textTarget)}
            </div>
            <div className="pl-1">
              <p className="text-muted-foreground text-lg">
                {currentPageData?.textNative}
              </p>
            </div>
          </div>
        </div>
        {/* Image */}
        <div className="relative flex min-h-0 items-center justify-center overflow-hidden lg:rounded-lg">
          {currentPageData?.imageKey ? (
            <PresignedImage
              src={currentPageData.imageKey}
              alt={`Page ${currentPage} illustration`}
              className="h-full w-full object-contain"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-muted-foreground">No image available</p>
            </div>
          )}
        </div>
      </div>
      {/* Audio Player */}
      {currentPageData?.audioKey && (
        <div className="flex shrink-0 justify-center">
          <div className="max-w-[500px]">
            <AudioPlayer
              src={`/api/storage/presigned?key=${encodeURIComponent(currentPageData.audioKey)}&redirect=true`}
              autoPlay={isPlaying}
              delay={settings?.audioPlaybackDelay ?? 1000}
              onEnded={handleAudioEnded}
              enableShortcuts={true}
              shortcuts={{
                forward: settings?.shortcutAudioForward,
                back: settings?.shortcutAudioBack,
                playPause: settings?.shortcutAudioPlayPause,
                stop: settings?.shortcutAudioStop,
              }}
            />
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="mt-6 flex shrink-0 items-center justify-between border-t pt-4">
        <Button
          variant="outline"
          onClick={prevPage}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Previous
        </Button>

        {/* Progress dots */}
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <span>
            Page {currentPage} of {totalPages}
          </span>
        </div>

        <Button variant={isLastPage ? "default" : "outline"} onClick={nextPage}>
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
            <div className="py-4 text-center">
              <p className="text-2xl font-bold">{story.title}</p>
              <p className="text-muted-foreground">
                You&apos;ve read this story {story.readCount ?? 0} times
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted rounded-lg p-4 text-center">
                <p className="text-3xl font-bold">{story.readCount ?? 0}</p>
                <p className="text-muted-foreground text-sm">Total Reads</p>
              </div>
              <div className="bg-muted rounded-lg p-4 text-center">
                <p className="text-3xl font-bold">{totalPages}</p>
                <p className="text-muted-foreground text-sm">Pages</p>
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
