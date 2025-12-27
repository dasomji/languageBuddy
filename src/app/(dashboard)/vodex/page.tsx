"use client";

import { useState } from "react";
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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { PresignedImage } from "~/components/ui/presigned-image";
import { AudioPlayer } from "~/components/ui/audio-player";
import { VocabCard } from "~/components/vodex/vocab-card";
import { NoActiveSpace } from "~/components/learning-space/no-active-space";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Loader2, Search, Library, Flame, Snowflake } from "lucide-react";
import { cn } from "~/lib/utils";

interface VocabEntry {
  id: string;
  word: string;
  translation: string;
  wordKind: string;
  sex: string | null;
  exampleSentence: string | null;
  imageKey: string | null;
  exampleAudioKey: string | null;
  lemma: string;
}

export default function VodexPage() {
  const [search, setSearch] = useState("");
  const [wordKindFilter, setWordKindFilter] = useState<string>("all");
  const [sexFilter, setSexFilter] = useState<string>("all");
  const [selectedVocab, setSelectedVocab] = useState<VocabEntry | null>(null);

  const [activeAudio, setActiveAudio] = useState<string | null>(null);

  const { data: activeSpace, isLoading: isLoadingSpace } =
    api.learningSpace.getActive.useQuery();

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
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Library className="h-8 w-8" />
          VoDex
        </h1>
        <p className="text-muted-foreground">
          Your vocabulary index - review and practice words you&apos;ve learned
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Words
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalWords ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total XP
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalXp ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Masculine Words
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" />
              {stats?.wordKindDistribution.find((w) => w.kind === "masculine")
                ?.count ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Feminine Words
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              <Snowflake className="h-5 w-5 text-cyan-500" />
              {stats?.wordKindDistribution.find((w) => w.kind === "feminine")
                ?.count ?? 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search words..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="wordKind">Word Kind</Label>
              <Select
                value={wordKindFilter}
                onValueChange={setWordKindFilter}
              >
                <SelectTrigger id="wordKind">
                  <SelectValue placeholder="All kinds" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All kinds</SelectItem>
                  <SelectItem value="noun">Nouns</SelectItem>
                  <SelectItem value="verb">Verbs</SelectItem>
                  <SelectItem value="adjective">Adjectives</SelectItem>
                  <SelectItem value="adverb">Adverbs</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sex">Gender</Label>
              <Select value={sexFilter} onValueChange={setSexFilter}>
                <SelectTrigger id="sex">
                  <SelectValue placeholder="All genders" />
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
        </CardContent>
      </Card>

      {/* Vocabulary Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : vocabData?.vocabularies.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Library className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No vocabulary found. Start writing diary entries to build your VoDex!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {vocabData?.vocabularies.map((vocab) => (
            <VocabCard
              key={vocab.id}
              vocab={vocab as VocabEntry}
              onPlayAudio={handlePlayAudio}
              onClick={() => setSelectedVocab(vocab as VocabEntry)}
            />
          ))}
        </div>
      )}

      {/* Hidden Audio Player for VoDex */}
      {activeAudio && (
        <div className="hidden">
          <AudioPlayer
            src={activeAudio}
            autoPlay={true}
            onEnded={() => setActiveAudio(null)}
          />
        </div>
      )}

      {/* Vocabulary Detail Dialog */}
      <Dialog open={!!selectedVocab} onOpenChange={() => setSelectedVocab(null)}>
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
                  selectedVocab?.wordKind?.toLowerCase() && wordKindColors[selectedVocab.wordKind.toLowerCase()]
                    ? wordKindColors[selectedVocab.wordKind.toLowerCase()]
                    : "bg-gray-100 text-gray-800"
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
                </div>
              )}
            </div>
            <div>
              {selectedVocab?.imageKey && (
                <div className="aspect-square w-full overflow-hidden rounded-md">
                  <PresignedImage
                    src={selectedVocab.imageKey}
                    alt={selectedVocab.word}
                    className="h-full w-full"
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

