"use client";
import { useEffect, useState } from "react";
import { api } from "~/trpc/react";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { PresignedImage } from "~/components/ui/presigned-image";
import { AudioPlayer } from "~/components/ui/audio-player";
import { NoActiveSpace } from "~/components/learning-space/no-active-space";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { useIsMobile } from "~/hooks/use-mobile";
import { useKeyboardShortcut } from "~/hooks/use-keyboard-shortcut";
import { Loader2, Search, Library, Flame, Snowflake, Play } from "lucide-react";
import { cn } from "~/lib/utils";

interface VocabEntry {
  id: string;
  word: string;
  translation: string;
  wordKind: string;
  sex: string | null;
  exampleSentence: string | null;
  exampleSentenceTranslation: string | null;
  imageKey: string | null;
  exampleAudioKey: string | null;
  lemma: string;
}

export default function VodexPage() {
  const [search, setSearch] = useState("");
  const [wordKindFilter, setWordKindFilter] = useState<string>("all");
  const [sexFilter, setSexFilter] = useState<string>("all");
  const [selectedVocab, setSelectedVocab] = useState<VocabEntry | null>(null);
  const [isMobileDialogOpen, setIsMobileDialogOpen] = useState(false);
  const isMobile = useIsMobile();

  const [activeAudio, setActiveAudio] = useState<string | null>(null);

  const { data: activeSpace, isLoading: isLoadingSpace } =
    api.learningSpace.getActive.useQuery();

  const { data: settings } = api.settings.get.useQuery();

  const { data: stats } = api.vodex.getStats.useQuery(undefined, {
    enabled: !!activeSpace,
  });
  const { data: vocabData, isLoading } = api.vodex.getAll.useQuery(
    {
      search: search || undefined,
      wordKind: wordKindFilter !== "all" ? wordKindFilter : undefined,
      sex: sexFilter !== "all" ? sexFilter : undefined,
    },
    {
      enabled: !!activeSpace,
    },
  );

  const handleNextWord = () => {
    if (!vocabData?.vocabularies || !selectedVocab) return;
    const currentIndex = vocabData.vocabularies.findIndex(
      (v) => v.id === selectedVocab.id,
    );
    if (currentIndex < vocabData.vocabularies.length - 1) {
      const next = vocabData.vocabularies[currentIndex + 1] as VocabEntry;
      setSelectedVocab(next);
      // Auto-scroll the list
      const element = document.getElementById(`vocab-${next.id}`);
      element?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  };

  const handlePrevWord = () => {
    if (!vocabData?.vocabularies || !selectedVocab) return;
    const currentIndex = vocabData.vocabularies.findIndex(
      (v) => v.id === selectedVocab.id,
    );
    if (currentIndex > 0) {
      const prev = vocabData.vocabularies[currentIndex - 1] as VocabEntry;
      setSelectedVocab(prev);
      // Auto-scroll the list
      const element = document.getElementById(`vocab-${prev.id}`);
      element?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  };

  useKeyboardShortcut(
    settings?.shortcutVodexNext ?? "ArrowDown",
    handleNextWord,
    !!settings,
  );
  useKeyboardShortcut(
    settings?.shortcutVodexPrev ?? "ArrowUp",
    handlePrevWord,
    !!settings,
  );

  useEffect(() => {
    if (
      !selectedVocab &&
      vocabData?.vocabularies &&
      vocabData.vocabularies.length > 0
    ) {
      setSelectedVocab(vocabData.vocabularies[0] as VocabEntry);
    }
  }, [vocabData?.vocabularies, selectedVocab]);

  const handlePlayAudio = (audioKey: string) => {
    setActiveAudio(
      `/api/storage/presigned?key=${encodeURIComponent(audioKey)}&redirect=true`,
    );
  };

  const wordKindColors: Record<string, string> = {
    noun: "bg-blue-100 text-blue-800",
    verb: "bg-red-100 text-red-800",
    adjective: "bg-green-100 text-green-800",
    adverb: "bg-yellow-100 text-yellow-800",
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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <Library className="h-8 w-8" />
          VoDex: {stats?.totalWords}
        </h1>
        <p className="text-muted-foreground">
          Your vocabulary index - review and practice words you&apos;ve learned
        </p>
      </div>

      {/* Main Content: Split Layout */}
      <div className="flex h-[calc(100vh-280px)] min-h-[500px] flex-col gap-6 lg:flex-row">
        {/* Left Column: List and Filters */}
        <div className="flex w-full flex-col gap-4 lg:w-1/3">
          {/* Search and Filters */}
          <div className="space-y-4">
            <div className="relative">
              <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <Input
                id="search"
                placeholder="Search words..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Select value={wordKindFilter} onValueChange={setWordKindFilter}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Kind" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All kinds</SelectItem>
                  <SelectItem value="noun">Nouns</SelectItem>
                  <SelectItem value="verb">Verbs</SelectItem>
                  <SelectItem value="adjective">Adjectives</SelectItem>
                  <SelectItem value="adverb">Adverbs</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sexFilter} onValueChange={setSexFilter}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All genders</SelectItem>
                  <SelectItem value="masculine">Masculine</SelectItem>
                  <SelectItem value="feminine">Feminine</SelectItem>
                  <SelectItem value="neuter">Neuter</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Vocabulary List */}
          <div className="bg-card/50 flex-1 overflow-y-auto rounded-xl border p-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
              </div>
            ) : vocabData?.vocabularies.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Library className="text-muted-foreground mb-4 h-12 w-12" />
                <p className="text-muted-foreground text-sm">
                  No vocabulary found.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {vocabData?.vocabularies.map((vocab) => (
                  <div
                    key={vocab.id}
                    id={`vocab-${vocab.id}`}
                    onClick={() => {
                      setSelectedVocab(vocab as VocabEntry);
                      if (isMobile) {
                        setIsMobileDialogOpen(true);
                      }
                    }}
                    className={cn(
                      "hover:bg-accent/50 flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-colors",
                      selectedVocab?.id === vocab.id
                        ? "border-primary bg-accent"
                        : "bg-card border-transparent",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium">
                          {vocab.word}
                        </span>
                        {vocab.sex === "masculine" && (
                          <Flame className="h-3 w-3 text-orange-500" />
                        )}
                        {vocab.sex === "feminine" && (
                          <Snowflake className="h-3 w-3 text-cyan-500" />
                        )}
                      </div>
                      <p className="text-muted-foreground truncate text-xs">
                        {vocab.translation}
                      </p>
                    </div>
                    <Badge variant="outline" className="ml-2 h-5 text-[10px]">
                      {vocab.wordKind}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Preview */}
        <div className="bg-card hidden flex-1 overflow-y-auto rounded-xl border lg:block">
          {selectedVocab ? (
            <div className="p-6">
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-3xl font-bold">{selectedVocab.word}</h2>
                    {selectedVocab.sex === "masculine" && (
                      <Flame className="h-6 w-6 text-orange-500" />
                    )}
                    {selectedVocab.sex === "feminine" && (
                      <Snowflake className="h-6 w-6 text-cyan-500" />
                    )}
                  </div>
                  <p className="text-muted-foreground mt-1 text-xl">
                    {selectedVocab.translation}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge
                    className={cn(
                      "px-3 py-1 text-sm",
                      selectedVocab.wordKind?.toLowerCase() &&
                        wordKindColors[selectedVocab.wordKind.toLowerCase()]
                        ? wordKindColors[selectedVocab.wordKind.toLowerCase()]
                        : "bg-gray-100 text-gray-800",
                    )}
                  >
                    {selectedVocab.wordKind}
                  </Badge>
                  {selectedVocab.exampleAudioKey && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handlePlayAudio(selectedVocab.exampleAudioKey!)
                      }
                    >
                      <Play className="mr-2 h-4 w-4" />
                      Listen
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid gap-8 md:grid-cols-2">
                <div className="space-y-6">
                  <div>
                    <Label className="text-muted-foreground text-sm tracking-wider uppercase">
                      Lemma / Base Form
                    </Label>
                    <p className="text-lg font-medium">{selectedVocab.lemma}</p>
                  </div>

                  {selectedVocab.exampleSentence && (
                    <div>
                      <Label className="text-muted-foreground text-sm tracking-wider uppercase">
                        Example Sentence
                      </Label>
                      <div className="bg-muted mt-2 rounded-lg p-4">
                        <p className="text-lg leading-relaxed italic">
                          &quot;{selectedVocab.exampleSentence}&quot;
                        </p>
                        {selectedVocab.exampleSentenceTranslation && (
                          <p className="text-muted-foreground mt-2 border-t pt-2 text-sm">
                            {selectedVocab.exampleSentenceTranslation}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <Label className="text-muted-foreground text-sm tracking-wider uppercase">
                    Visual Memory
                  </Label>
                  {selectedVocab.imageKey ? (
                    <div className="overflow-hidden rounded-xl border shadow-sm">
                      <div className="relative aspect-square w-full">
                        <PresignedImage
                          src={selectedVocab.imageKey}
                          alt={selectedVocab.word}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="bg-muted/50 flex aspect-square items-center justify-center rounded-xl border border-dashed">
                      <p className="text-muted-foreground text-sm italic">
                        No image available
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center p-12 text-center">
              <Library className="text-muted-foreground/20 mb-4 h-16 w-16" />
              <h3 className="text-muted-foreground text-xl font-medium">
                Select a word to see details
              </h3>
              <p className="text-muted-foreground mt-2 max-w-xs">
                Choose a word from the list on the left to view its translation,
                examples, and mnemonic image.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Hidden Audio Player for VoDex */}
      {activeAudio && (
        <div className="hidden">
          <AudioPlayer
            src={activeAudio}
            autoPlay={true}
            onEnded={() => setActiveAudio(null)}
            enableShortcuts={true}
            shortcuts={{
              forward: settings?.shortcutAudioForward,
              back: settings?.shortcutAudioBack,
              playPause: settings?.shortcutAudioPlayPause,
              stop: settings?.shortcutAudioStop,
            }}
          />
        </div>
      )}

      {/* Mobile Vocabulary Detail Dialog */}
      <Dialog open={isMobileDialogOpen} onOpenChange={setIsMobileDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <DialogTitle className="text-2xl">
                {selectedVocab?.word}
              </DialogTitle>
              {selectedVocab?.sex === "masculine" && (
                <Flame className="h-5 w-5 text-orange-500" />
              )}
              {selectedVocab?.sex === "feminine" && (
                <Snowflake className="h-5 w-5 text-cyan-500" />
              )}
              <Badge
                className={cn(
                  selectedVocab?.wordKind?.toLowerCase() &&
                    wordKindColors[selectedVocab.wordKind.toLowerCase()]
                    ? wordKindColors[selectedVocab.wordKind.toLowerCase()]
                    : "bg-gray-100 text-gray-800",
                )}
              >
                {selectedVocab?.wordKind}
              </Badge>
            </div>
          </DialogHeader>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Translation</Label>
                <p className="text-lg">{selectedVocab?.translation}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Lemma</Label>
                <p className="text-lg">{selectedVocab?.lemma}</p>
              </div>
              {selectedVocab?.exampleSentence && (
                <div>
                  <Label className="text-muted-foreground">
                    Example Sentence
                  </Label>
                  <p className="text-lg italic">
                    &quot;{selectedVocab.exampleSentence}&quot;
                  </p>
                  {selectedVocab.exampleSentenceTranslation && (
                    <p className="text-muted-foreground mt-1 text-sm">
                      {selectedVocab.exampleSentenceTranslation}
                    </p>
                  )}
                </div>
              )}
              {selectedVocab?.exampleAudioKey && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() =>
                    handlePlayAudio(selectedVocab.exampleAudioKey!)
                  }
                >
                  <Play className="mr-2 h-4 w-4" />
                  Listen to Example
                </Button>
              )}
            </div>
            <div>
              {selectedVocab?.imageKey && (
                <div className="aspect-square w-full overflow-hidden rounded-md border">
                  <PresignedImage
                    src={selectedVocab.imageKey}
                    alt={selectedVocab.word}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
