"use client";

import { useState, useRef, useEffect } from "react";
import type { Rating } from "ts-fsrs";
import { api } from "~/trpc/react";
import { Progress } from "~/components/ui/progress";
import { Button } from "~/components/ui/button";
import { ExerciseCard } from "./exercise-card";
import { RatingButtons } from "./rating-buttons";
import { SessionSummary } from "./session-summary";
import { AudioPlayer } from "~/components/ui/audio-player";
import { X, Loader2 } from "lucide-react";
import type { PracticeExercise, SessionStats } from "~/lib/gym/types";

interface PracticeSessionProps {
  sessionId: string;
  exercises: PracticeExercise[];
  onClose: () => void;
}

export function PracticeSession({
  sessionId,
  exercises,
  onClose,
}: PracticeSessionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [userAnswer, setUserAnswer] = useState("");
  const [sessionStats, setSessionStats] = useState<SessionStats | null>(null);
  const [activeAudio, setActiveAudio] = useState<string | null>(null);
  const [totalXpGained, setTotalXpGained] = useState(0);

  // Timer for response time
  const startTimeRef = useRef<number>(Date.now());

  const submitResult = api.gym.submitResult.useMutation();
  const completeSession = api.gym.completeSession.useMutation();

  const currentExercise = exercises[currentIndex];
  const isLastExercise = currentIndex === exercises.length - 1;
  const isSessionComplete = sessionStats !== null;

  // Reset timer when exercise changes
  useEffect(() => {
    startTimeRef.current = Date.now();
    setIsAnswerRevealed(false);
    setUserAnswer("");
  }, [currentIndex]);

  const handleAnswerRevealed = (answer: string) => {
    setUserAnswer(answer);
    setIsAnswerRevealed(true);
  };

  const handleRate = async (rating: Rating) => {
    if (!currentExercise) return;

    const responseTimeMs = Date.now() - startTimeRef.current;

    try {
      const result = await submitResult.mutateAsync({
        sessionId,
        vocabId: currentExercise.vocabId,
        practiceType: currentExercise.practiceType,
        rating,
        userAnswer,
        correctAnswer: currentExercise.correctAnswer,
        responseTimeMs,
        promptText: currentExercise.promptText,
      });

      setTotalXpGained((prev) => prev + result.xpGained);

      if (isLastExercise) {
        // Complete session
        const stats = await completeSession.mutateAsync({ sessionId });
        setSessionStats(stats);
      } else {
        // Move to next exercise
        setCurrentIndex((prev) => prev + 1);
      }
    } catch (error) {
      console.error("Failed to submit result:", error);
    }
  };

  const handlePlayAudio = (audioKey: string) => {
    setActiveAudio(
      `/api/storage/presigned?key=${encodeURIComponent(audioKey)}&redirect=true`,
    );
  };

  const handlePracticeAgain = () => {
    // Reset session state
    setCurrentIndex(0);
    setSessionStats(null);
    setTotalXpGained(0);
    setIsAnswerRevealed(false);
    setUserAnswer("");
    startTimeRef.current = Date.now();
  };

  // Show session summary when complete
  if (isSessionComplete && sessionStats) {
    return (
      <SessionSummary
        stats={sessionStats}
        onPracticeAgain={handlePracticeAgain}
        onClose={onClose}
      />
    );
  }

  if (!currentExercise) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const progressPercent = ((currentIndex + 1) / exercises.length) * 100;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">
              {currentIndex + 1} / {exercises.length}
            </span>
          </div>
        </div>

        {/* XP Counter */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-amber-600">
            +{totalXpGained} XP
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-4 pt-4">
        <Progress value={progressPercent} className="h-2" />
      </div>

      {/* Main Content */}
      <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto p-4">
        <div className="w-full max-w-2xl space-y-6">
          {/* Exercise Card */}
          <ExerciseCard
            exercise={currentExercise}
            onAnswerRevealed={handleAnswerRevealed}
            onPlayAudio={handlePlayAudio}
          />

          {/* Rating Buttons (shown after reveal) */}
          {isAnswerRevealed && (
            <div className="mx-auto max-w-md animate-in fade-in slide-in-from-bottom-4 duration-300">
              <RatingButtons
                onRate={handleRate}
                disabled={submitResult.isPending}
              />
              {submitResult.isPending && (
                <div className="mt-4 flex justify-center">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Hidden Audio Player */}
      {activeAudio && (
        <div className="hidden">
          <AudioPlayer
            src={activeAudio}
            autoPlay={true}
            onEnded={() => setActiveAudio(null)}
          />
        </div>
      )}
    </div>
  );
}

