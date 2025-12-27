"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { PresignedImage } from "~/components/ui/presigned-image";
import { Play, X, Flame, Snowflake, Info } from "lucide-react";
import { cn } from "~/lib/utils";

interface VocabCardProps {
  vocab: {
    id: string;
    word: string;
    translation: string;
    wordKind: string;
    sex: string | null;
    exampleSentence: string | null;
    imageKey: string | null;
    exampleAudioKey: string | null;
  };
  onPlayAudio?: (audioKey: string) => void;
  onClick?: () => void;
}

const wordKindColors: Record<string, string> = {
  noun: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  verb: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  adjective: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  adverb: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  preposition: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  conjunction: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
  pronoun: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  interjection: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300",
};

export function VocabCard({ vocab, onPlayAudio, onClick }: VocabCardProps) {
  const [imageError, setImageError] = useState(false);

  const sexIcon = vocab.sex === "masculine" 
    ? <Flame className="h-4 w-4 text-orange-500" />
    : vocab.sex === "feminine"
    ? <Snowflake className="h-4 w-4 text-cyan-500" />
    : null;

  const wordKindColor = wordKindColors[vocab.wordKind.toLowerCase()] ?? "bg-gray-100 text-gray-800";

  return (
    <Card 
      className={cn(
        "cursor-pointer transition-shadow hover:shadow-md",
        onClick && "cursor-pointer"
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-xl">{vocab.word}</CardTitle>
            {sexIcon}
          </div>
          <Badge className={wordKindColor}>{vocab.wordKind}</Badge>
        </div>
        <CardDescription className="text-base">{vocab.translation}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {vocab.imageKey && !imageError && (
          <div className="relative aspect-square w-full overflow-hidden rounded-md">
            <PresignedImage
              src={vocab.imageKey}
              alt={vocab.word}
              className="h-full w-full"
            />
          </div>
        )}
        {vocab.exampleSentence && (
          <div className="rounded-md bg-muted p-3">
            <p className="text-sm italic text-muted-foreground">
              &quot;{vocab.exampleSentence}&quot;
            </p>
          </div>
        )}
        {onPlayAudio && vocab.exampleAudioKey && (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={(e) => {
              e.stopPropagation();
              onPlayAudio(vocab.exampleAudioKey!);
            }}
          >
            <Play className="mr-2 h-4 w-4" />
            Play Example
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

