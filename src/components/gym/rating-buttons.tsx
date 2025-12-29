"use client";

import { useEffect } from "react";
import { Rating } from "ts-fsrs";
import { Button } from "~/components/ui/button";
import { RATING_CONFIG } from "~/lib/gym/types";
import { cn } from "~/lib/utils";

interface RatingButtonsProps {
  onRate: (rating: Rating) => void;
  disabled?: boolean;
  showKeyboardHints?: boolean;
}

export function RatingButtons({
  onRate,
  disabled = false,
  showKeyboardHints = true,
}: RatingButtonsProps) {
  // Keyboard shortcuts for ratings
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled) return;

      // Prevent triggering when typing in inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key) {
        case "1":
          onRate(Rating.Again);
          break;
        case "2":
          onRate(Rating.Hard);
          break;
        case "3":
          onRate(Rating.Good);
          break;
        case "4":
          onRate(Rating.Easy);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onRate, disabled]);

  const ratings = [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy] as const;

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="grid grid-cols-4 gap-2">
        {ratings.map((rating) => {
          const config = RATING_CONFIG[rating];
          return (
            <Button
              key={rating}
              onClick={() => onRate(rating)}
              disabled={disabled}
              className={cn(
                "flex h-auto flex-col gap-0.5 py-3 text-white transition-all",
                config.bgClass,
                disabled && "cursor-not-allowed opacity-50",
              )}
            >
              <span className="text-sm font-semibold">{config.label}</span>
              {showKeyboardHints && (
                <span className="text-xs opacity-75">({config.shortcut})</span>
              )}
            </Button>
          );
        })}
      </div>
      <div className="grid grid-cols-4 gap-2 text-center">
        {ratings.map((rating) => {
          const config = RATING_CONFIG[rating];
          return (
            <span
              key={rating}
              className="text-muted-foreground text-[10px] leading-tight"
            >
              {config.description}
            </span>
          );
        })}
      </div>
    </div>
  );
}

