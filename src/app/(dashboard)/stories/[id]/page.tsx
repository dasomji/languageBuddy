"use client";
import { useState, useEffect, useCallback, use, useMemo } from "react";
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
  Volume2,
} from "lucide-react";
import { type RouterOutputs } from "~/trpc/react";

type Vocab = RouterOutputs["vodex"]["lookup"];

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
  const [vocabData, setVocabData] = useState<Record<string, Vocab>>({});
  const [failedWords, setFailedWords] = useState<Set<string>>(new Set());
  const [isPreloadingVocab, setIsPreloadingVocab] = useState(false);

  const storyId = resolvedParams.id;
  const { data: story, isLoading } = api.story.getById.useQuery({
    id: storyId,
  });

  const utils = api.useUtils();
  const { data: settings } = api.settings.get.useQuery();

  const updateProgress = api.story.updateProgress.useMutation();

  const pages = story?.pages ?? [];
  const totalPages = pages.length;
  const currentPageData = pages.find((p) => p.pageNumber === currentPage);
  const isLastPage = currentPage === totalPages;

  // Extract all unique words from the story
  const allWords = useMemo(() => {
    if (!story) return [];
    const text = story.pages.map((p) => p.textTarget).join(" ");
    const words = text.split(/\s+/);
    const uniqueWords = Array.from(
      new Set(words.map((w) => w.replace(/[.,!?;:]/g, "").trim())),
    ).filter((w) => w.length > 0);
    return uniqueWords;
  }, [story]);

  // Preload vocab data for all words
  useEffect(() => {
    if (allWords.length > 0 && !isPreloadingVocab) {
      const fetchVocab = async () => {
        setIsPreloadingVocab(true);
        const results = await Promise.all(
          allWords.map(async (word) => {
            try {
              const data = await utils.vodex.lookup.fetch({ word });
              return { word, data, success: !!data };
            } catch (error) {
              // Actual network or server errors still go here
              return { word, data: null, success: false };
            }
          }),
        );

        const newVocabData: Record<string, Vocab> = {};
        const newFailedWords = new Set<string>();

        results.forEach((res) => {
          if (res.success && res.data) {
            newVocabData[res.word] = res.data;
          } else {
            newFailedWords.add(res.word);
          }
        });

        setVocabData(newVocabData);
        setFailedWords(newFailedWords);
        setIsPreloadingVocab(false);
      };

      void fetchVocab();
    }
  }, [allWords, utils.vodex.lookup]);

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
    if (failedWords.has(word)) return; // Not clickable if it failed lookup (e.g. name)
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

  const selectedVocab = selectedWord ? vocabData[selectedWord] : null;

  // Parse text into clickable words
  const renderTextWithClickableWords = (text: string) => {
    const words = text.split(/\s+/);
    return (
      <p className="text-2xl leading-relaxed sm:text-3xl">
        {words.map((word, index) => {
          const cleanWord = word.replace(/[.,!?;:]/g, "");
          const isClickable = !failedWords.has(cleanWord) && vocabData[cleanWord];

          return (
            <span key={index} className="inline">
              {isClickable ? (
                <button
                  type="button"
                  onClick={() => handleWordClick(cleanWord)}
                  className="hover:bg-primary/20 inline-block cursor-pointer rounded px-1 transition-colors"
                >
                  {word}
                </button>
              ) : (
                <span className="inline-block px-1 text-muted-foreground/80">
                  {word}
                </span>
              )}
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
    <div className="flex max-h-full min-h-0 flex-1 flex-col">
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
                <BreadcrumbPage className="font-bold sm:text-xl">
                  {story.title}
                </BreadcrumbPage>
                <div className="hidden sm:block">
                  <Badge variant="outline">{story.languageLevel}</Badge>
                </div>
              </div>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </HeaderSetter>

      {/* Story Content */}
      <div className="flex min-h-0 flex-1 flex-col gap-6 sm:grid sm:grid-cols-2">
        {/* Text */}
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center space-y-6 overflow-y-auto">
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
        <div className="relative flex min-h-0 shrink items-center justify-center overflow-hidden lg:rounded-lg">
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
        <DialogContent className="max-w-[95vw] sm:max-w-lg">
          {selectedVocab ? (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between pr-8">
                  <div>
                    <DialogTitle className="text-3xl font-bold">
                      {selectedVocab.word}
                    </DialogTitle>
                    <p className="text-muted-foreground text-sm italic">
                      {selectedVocab.lemma !== selectedVocab.word &&
                        `(${selectedVocab.lemma}) • `}
                      {selectedVocab.wordKind}
                      {selectedVocab.sex &&
                        selectedVocab.sex !== "none" &&
                        ` • ${selectedVocab.sex}`}
                    </p>
                  </div>
                </div>
              </DialogHeader>

              <div className="grid gap-6 py-4">
                {/* Image */}
                {selectedVocab.imageKey && (
                  <div className="relative aspect-square overflow-hidden rounded-xl border">
                    <PresignedImage
                      src={selectedVocab.imageKey}
                      alt={selectedVocab.word}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}

                {/* Translation & Definition */}
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                      Translation
                    </h4>
                    <p className="text-2xl font-semibold">
                      {selectedVocab.translation}
                    </p>
                  </div>

                  {selectedVocab.definition && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                        Definition
                      </h4>
                      <p className="text-lg">{selectedVocab.definition}</p>
                    </div>
                  )}

                  {selectedVocab.exampleSentence && (
                    <div className="bg-muted/50 rounded-lg p-4">
                      <h4 className="mb-2 text-sm font-medium text-muted-foreground uppercase tracking-wider">
                        Example
                      </h4>
                      <div className="space-y-2">
                        <p className="text-xl leading-snug font-medium">
                          {selectedVocab.exampleSentence}
                        </p>
                        <p className="text-muted-foreground italic">
                          {selectedVocab.exampleSentenceTranslation}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Audio */}
                {selectedVocab.exampleAudioKey && (
                  <div className="flex justify-center pt-2">
                    <AudioPlayer
                      src={`/api/storage/presigned?key=${encodeURIComponent(selectedVocab.exampleAudioKey)}&redirect=true`}
                    />
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="py-12 text-center">
              <div className="border-primary mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2" />
              <p className="text-muted-foreground">Loading word details...</p>
            </div>
          )}
          <div className="flex justify-end border-t pt-4">
            <Button variant="outline" onClick={() => setSelectedWord(null)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
