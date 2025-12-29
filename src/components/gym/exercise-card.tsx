"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";
import { PresignedImage } from "~/components/ui/presigned-image";
import {
  Eye,
  Play,
  Flame,
  Snowflake,
  Lightbulb,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { cn } from "~/lib/utils";
import {
  PracticeType,
  PRACTICE_TYPE_CONFIGS,
  type PracticeExercise,
} from "~/lib/gym/types";

interface ExerciseCardProps {
  exercise: PracticeExercise;
  onAnswerRevealed: (userAnswer: string) => void;
  onPlayAudio?: (audioKey: string) => void;
}

export function ExerciseCard({
  exercise,
  onAnswerRevealed,
  onPlayAudio,
}: ExerciseCardProps) {
  const [userAnswer, setUserAnswer] = useState("");
  const [isRevealed, setIsRevealed] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const practiceConfig = PRACTICE_TYPE_CONFIGS[exercise.practiceType];
  const isRecognition = exercise.practiceType === PracticeType.FOREIGN_RECOGNITION;

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, [exercise.vocabId]);

  // Reset state when exercise changes
  useEffect(() => {
    setUserAnswer("");
    setIsRevealed(false);
    setShowHint(false);
  }, [exercise.vocabId]);

  const handleReveal = () => {
    setIsRevealed(true);
    onAnswerRevealed(userAnswer);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isRevealed) {
      handleReveal();
    }
  };

  // Check if answer is approximately correct (for visual feedback)
  const isCorrect =
    isRevealed &&
    userAnswer.trim().toLowerCase() ===
      exercise.correctAnswer.trim().toLowerCase();

  const wordKindColors: Record<string, string> = {
    noun: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    verb: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    adjective:
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    adverb:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  };

  return (
    <Card className="mx-auto w-full max-w-2xl">
      <CardContent className="space-y-6 p-6">
        {/* Practice Type Badge */}
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-xs">
            {practiceConfig.displayName}
          </Badge>
          <div className="flex items-center gap-2">
            <Badge
              className={cn(
                "text-xs",
                wordKindColors[exercise.vocab.wordKind.toLowerCase()] ??
                  "bg-gray-100 text-gray-800",
              )}
            >
              {exercise.vocab.wordKind}
            </Badge>
            {exercise.vocab.sex === "masculine" && (
              <Flame className="h-4 w-4 text-orange-500" />
            )}
            {exercise.vocab.sex === "feminine" && (
              <Snowflake className="h-4 w-4 text-cyan-500" />
            )}
          </div>
        </div>

        {/* Prompt */}
        <div className="text-center">
          <p className="text-muted-foreground mb-2 text-sm">
            {practiceConfig.instructions}
          </p>
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            {exercise.promptText}
          </h2>
        </div>

        {/* Image (if available and recognition type) */}
        {isRecognition && exercise.vocab.imageKey && (
          <div className="flex justify-center">
            <div className="relative aspect-square w-48 overflow-hidden rounded-xl border shadow-sm">
              <PresignedImage
                src={exercise.vocab.imageKey}
                alt={exercise.vocab.word}
                className="h-full w-full object-contain"
              />
            </div>
          </div>
        )}

        {/* Audio button */}
        {exercise.vocab.exampleAudioKey && onPlayAudio && (
          <div className="flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPlayAudio(exercise.vocab.exampleAudioKey!)}
            >
              <Play className="mr-2 h-4 w-4" />
              Play Audio
            </Button>
          </div>
        )}

        {/* Answer Input */}
        <div className="space-y-2">
          <div className="relative">
            <Input
              ref={inputRef}
              type="text"
              placeholder={
                isRecognition
                  ? "Type the translation..."
                  : "Type in target language..."
              }
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isRevealed}
              className={cn(
                "pr-10 text-center text-lg",
                isRevealed && isCorrect && "border-green-500 bg-green-50",
                isRevealed && !isCorrect && "border-orange-500 bg-orange-50",
              )}
            />
            {isRevealed && (
              <div className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2">
                {isCorrect ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-orange-500" />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Hint Toggle */}
        {exercise.hints && exercise.hints.length > 0 && !isRevealed && (
          <div className="flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHint(!showHint)}
              className="text-muted-foreground"
            >
              <Lightbulb className="mr-2 h-4 w-4" />
              {showHint ? "Hide hint" : "Show hint"}
            </Button>
          </div>
        )}

        {/* Hint Display */}
        {showHint && exercise.hints && exercise.hints.length > 0 && (
          <div className="bg-muted rounded-lg p-3 text-center">
            <p className="text-muted-foreground text-sm italic">
              &quot;{exercise.hints[0]}&quot;
            </p>
          </div>
        )}

        {/* Reveal Button or Answer Display */}
        {!isRevealed ? (
          <Button onClick={handleReveal} className="w-full" size="lg">
            <Eye className="mr-2 h-4 w-4" />
            Reveal Answer
          </Button>
        ) : (
          <div className="space-y-4">
            {/* Correct Answer */}
            <div className="rounded-xl border-2 border-dashed p-4 text-center">
              <p className="text-muted-foreground mb-1 text-sm">
                Correct answer:
              </p>
              <p className="text-2xl font-bold text-green-600">
                {exercise.correctAnswer}
              </p>
            </div>

            {/* Example Sentence (if available) */}
            {exercise.vocab.exampleSentence && (
              <div className="bg-muted rounded-lg p-4">
                <p className="mb-1 text-sm font-medium">Example:</p>
                <p className="italic">&quot;{exercise.vocab.exampleSentence}&quot;</p>
                {exercise.vocab.exampleSentenceTranslation && (
                  <p className="text-muted-foreground mt-1 text-sm">
                    {exercise.vocab.exampleSentenceTranslation}
                  </p>
                )}
              </div>
            )}

            {/* Self-Assessment Prompt */}
            <div className="text-muted-foreground text-center text-sm">
              How well did you know this? Rate yourself below:
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

