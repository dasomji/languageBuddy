"use client";

import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Trophy,
  RefreshCcw,
  Home,
  Zap,
  Clock,
  Target,
  TrendingUp,
} from "lucide-react";
import { cn } from "~/lib/utils";
import type { SessionStats } from "~/lib/gym/types";

interface SessionSummaryProps {
  stats: SessionStats;
  onPracticeAgain: () => void;
  onClose: () => void;
}

export function SessionSummary({
  stats,
  onPracticeAgain,
  onClose,
}: SessionSummaryProps) {
  const totalRatings =
    stats.ratingDistribution.again +
    stats.ratingDistribution.hard +
    stats.ratingDistribution.good +
    stats.ratingDistribution.easy;

  const successRate =
    totalRatings > 0
      ? Math.round(
          ((stats.ratingDistribution.good + stats.ratingDistribution.easy) /
            totalRatings) *
            100,
        )
      : 0;

  const avgTimeSeconds = Math.round(stats.averageResponseTime / 1000);

  const ratingBars = [
    {
      label: "Again",
      count: stats.ratingDistribution.again,
      color: "bg-red-500",
      textColor: "text-red-600",
    },
    {
      label: "Hard",
      count: stats.ratingDistribution.hard,
      color: "bg-orange-500",
      textColor: "text-orange-600",
    },
    {
      label: "Good",
      count: stats.ratingDistribution.good,
      color: "bg-green-500",
      textColor: "text-green-600",
    },
    {
      label: "Easy",
      count: stats.ratingDistribution.easy,
      color: "bg-blue-500",
      textColor: "text-blue-600",
    },
  ];

  return (
    <div className="flex h-full flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        {/* Trophy Animation */}
        <div className="flex flex-col items-center text-center">
          <div className="bg-primary/10 mb-4 flex h-20 w-20 items-center justify-center rounded-full">
            <Trophy className="text-primary h-10 w-10" />
          </div>
          <h1 className="text-2xl font-bold">Session Complete!</h1>
          <p className="text-muted-foreground mt-1">
            Great work building your memory muscles
          </p>
        </div>

        {/* XP Earned */}
        <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50 dark:border-amber-800 dark:from-amber-950 dark:to-yellow-950">
          <CardContent className="flex items-center justify-center gap-3 py-6">
            <Zap className="h-8 w-8 text-amber-500" />
            <div className="text-center">
              <p className="text-3xl font-bold text-amber-600">
                +{stats.totalXp} XP
              </p>
              <p className="text-sm text-amber-700">Total earned</p>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="flex flex-col items-center p-4 text-center">
              <Target className="text-primary mb-1 h-5 w-5" />
              <p className="text-xl font-bold">{stats.completedCount}</p>
              <p className="text-muted-foreground text-xs">Exercises</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col items-center p-4 text-center">
              <TrendingUp className="mb-1 h-5 w-5 text-green-500" />
              <p className="text-xl font-bold">{successRate}%</p>
              <p className="text-muted-foreground text-xs">Success Rate</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col items-center p-4 text-center">
              <Clock className="text-muted-foreground mb-1 h-5 w-5" />
              <p className="text-xl font-bold">{avgTimeSeconds}s</p>
              <p className="text-muted-foreground text-xs">Avg Time</p>
            </CardContent>
          </Card>
        </div>

        {/* Rating Distribution */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Rating Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {ratingBars.map((bar) => {
              const percent =
                totalRatings > 0
                  ? Math.round((bar.count / totalRatings) * 100)
                  : 0;
              return (
                <div key={bar.label} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className={bar.textColor}>{bar.label}</span>
                    <span className="text-muted-foreground">
                      {bar.count} ({percent}%)
                    </span>
                  </div>
                  <div className="bg-muted h-2 overflow-hidden rounded-full">
                    <div
                      className={cn("h-full transition-all", bar.color)}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            <Home className="mr-2 h-4 w-4" />
            Dashboard
          </Button>
          <Button className="flex-1" onClick={onPracticeAgain}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Practice Again
          </Button>
        </div>
      </div>
    </div>
  );
}

