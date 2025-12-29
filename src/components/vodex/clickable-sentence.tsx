"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { api } from "~/trpc/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { PresignedImage } from "~/components/ui/presigned-image";
import { AudioPlayer } from "~/components/ui/audio-player";
import { type RouterOutputs } from "~/trpc/react";
import { cn } from "~/lib/utils";

type Vocab = RouterOutputs["vodex"]["lookup"];

interface ClickableSentenceProps {
  sentence: string;
  className?: string;
  wordClassName?: string;
  storyId?: string;
  showQuotes?: boolean;
}

export function ClickableSentence({
  sentence,
  className,
  wordClassName,
  storyId,
  showQuotes = false,
}: ClickableSentenceProps) {
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [vocabData, setVocabData] = useState<Record<string, Vocab>>({});
  const [failedWords, setFailedWords] = useState<Set<string>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);
  const isPreloadingVocab = useRef(false);

  const utils = api.useUtils();

  const generateVocab = api.vodex.generateAndLookup.useMutation({
    onSuccess: (data, variables) => {
      if (data) {
        setVocabData((prev) => ({ ...prev, [variables.word]: data }));
        setFailedWords((prev) => {
          const next = new Set(prev);
          next.delete(variables.word);
          return next;
        });
      }
      setIsGenerating(false);
    },
    onError: () => {
      setIsGenerating(false);
    },
  });

  const words = useMemo(() => {
    return sentence
      .split(/\s+/)
      .map((w) => w.trim())
      .filter((w) => w.length > 0);
  }, [sentence]);

  const cleanWords = useMemo(() => {
    return Array.from(
      new Set(
        words.map((w) =>
          w
            .replace(/[.,!?;:]/g, "")
            .trim()
            .toLowerCase(),
        ),
      ),
    ).filter((w) => w.length > 0);
  }, [words]);

  useEffect(() => {
    if (cleanWords.length > 0 && !isPreloadingVocab.current) {
      const fetchVocab = async () => {
        isPreloadingVocab.current = true;
        const results = await Promise.all(
          cleanWords.map(async (word) => {
            try {
              const data = await utils.vodex.lookup.fetch({ word });
              return { word, data, success: !!data };
            } catch {
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

        setVocabData((prev) => ({ ...prev, ...newVocabData }));
        setFailedWords(
          (prev) =>
            new Set([...Array.from(prev), ...Array.from(newFailedWords)]),
        );
        isPreloadingVocab.current = false;
      };

      void fetchVocab();
    }
  }, [cleanWords, utils.vodex.lookup]);

  const handleWordClick = (word: string) => {
    const cleanWord = word.replace(/[.,!?;:]/g, "").toLowerCase();
    if (failedWords.has(cleanWord) && !vocabData[cleanWord]) {
      setIsGenerating(true);
      setSelectedWord(cleanWord);
      generateVocab.mutate({ word: cleanWord, storyId });
      return;
    }
    setSelectedWord(cleanWord);
  };

  const selectedVocab = selectedWord ? vocabData[selectedWord] : null;

  return (
    <>
      <div className={cn("inline-block", className)}>
        {showQuotes && <span>&quot;</span>}
        {words.map((word, index) => {
          const cleanWord = word.replace(/[.,!?;:]/g, "").toLowerCase();
          const isKnown = vocabData[cleanWord];
          const isFailed = failedWords.has(cleanWord);

          return (
            <span key={index} className="inline">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleWordClick(word);
                }}
                className={cn(
                  "hover:bg-primary/20 inline-block cursor-pointer rounded px-0.5 transition-colors",
                  !isKnown && isFailed && "text-muted-foreground/60 italic",
                  wordClassName,
                )}
              >
                {word}
              </button>
              {index < words.length - 1 ? " " : ""}
            </span>
          );
        })}
        {showQuotes && <span>&quot;</span>}
      </div>

      <Dialog open={!!selectedWord} onOpenChange={() => setSelectedWord(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg">
          {isGenerating ? (
            <>
              <DialogHeader>
                <DialogTitle>Generating VoDex Entry</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="border-primary mx-auto mb-6 h-16 w-16 animate-spin rounded-full border-b-4" />
                <p className="text-muted-foreground">
                  Creating mnemonic image and audio for &quot;{selectedWord}
                  &quot;...
                </p>
              </div>
            </>
          ) : selectedVocab ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-3xl font-bold">
                  {selectedVocab.word} = {selectedVocab.translation}
                </DialogTitle>
                <p className="text-muted-foreground text-sm italic">
                  {selectedVocab.lemma !== selectedVocab.word &&
                    `(${selectedVocab.lemma}) • `}
                  {selectedVocab.wordKind}
                  {selectedVocab.sex &&
                    selectedVocab.sex !== "none" &&
                    ` • ${selectedVocab.sex}`}
                </p>
              </DialogHeader>

              <div className="flex flex-col gap-4">
                {selectedVocab.imageKey && (
                  <div className="relative aspect-square max-h-[200px] overflow-hidden rounded-lg">
                    <PresignedImage
                      src={selectedVocab.imageKey}
                      alt={selectedVocab.word}
                      className="h-full w-full object-contain"
                    />
                  </div>
                )}

                <div className="space-y-4">
                  {selectedVocab.definition && (
                    <div>
                      <h4 className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                        Definition
                      </h4>
                      <p className="text-lg">{selectedVocab.definition}</p>
                    </div>
                  )}

                  {selectedVocab.exampleSentence && (
                    <div className="bg-muted/50 rounded-lg p-4">
                      <p className="text-xl leading-snug font-medium">
                        {selectedVocab.exampleSentence}
                      </p>
                      <p className="text-muted-foreground italic">
                        {selectedVocab.exampleSentenceTranslation}
                      </p>
                    </div>
                  )}
                </div>

                {selectedVocab.exampleAudioKey && (
                  <div className="flex justify-center pt-2">
                    <AudioPlayer
                      src={`/api/storage/presigned?key=${encodeURIComponent(
                        selectedVocab.exampleAudioKey,
                      )}&redirect=true`}
                    />
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Loading Word Details</DialogTitle>
              </DialogHeader>
              <div className="py-12 text-center">
                <div className="border-primary mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2" />
                <p className="text-muted-foreground">Loading word details...</p>
              </div>
            </>
          )}
          <div className="flex justify-end border-t pt-4">
            <Button variant="outline" onClick={() => setSelectedWord(null)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
