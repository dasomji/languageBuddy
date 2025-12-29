"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Progress } from "~/components/ui/progress";
import { Badge } from "~/components/ui/badge";
import { Slider } from "~/components/ui/slider";
import { PracticeSession } from "~/components/gym";
import { NoActiveSpace } from "~/components/learning-space/no-active-space";
import {
  Dumbbell,
  Loader2,
  Play,
  Zap,
  TrendingUp,
  Clock,
  Lock,
} from "lucide-react";
import { cn } from "~/lib/utils";
import {
  PRACTICE_TYPE_CONFIGS,
  type PracticeExercise,
} from "~/lib/gym/types";

export default function GymPage() {
  const [sessionData, setSessionData] = useState<{
    sessionId: string;
    exercises: PracticeExercise[];
  } | null>(null);
  const [targetCount, setTargetCount] = useState(20);

  const { data: activeSpace, isLoading: isLoadingSpace } =
    api.learningSpace.getActive.useQuery();

  const { data: dueData, isLoading: isLoadingDue } = api.gym.getDueCount.useQuery(
    undefined,
    { enabled: !!activeSpace },
  );

  const { data: stats, isLoading: isLoadingStats } = api.gym.getStats.useQuery(
    undefined,
    { enabled: !!activeSpace },
  );

  const startSession = api.gym.startSession.useMutation({
    onSuccess: (data) => {
      setSessionData({
        sessionId: data.sessionId,
        exercises: data.exercises,
      });
    },
  });

  const handleStartSession = () => {
    startSession.mutate({ targetCount });
  };

  const handleCloseSession = () => {
    setSessionData(null);
  };

  // Practice type cards for "coming soon" display
  const practiceTypes = Object.values(PRACTICE_TYPE_CONFIGS);

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

  // Show practice session if active
  if (sessionData) {
    return (
      <div className="fixed inset-0 z-50 bg-background">
        <PracticeSession
          sessionId={sessionData.sessionId}
          exercises={sessionData.exercises}
          onClose={handleCloseSession}
        />
      </div>
    );
  }

  const dueCount = dueData?.dueCount ?? 0;
  const totalCount = dueData?.totalCount ?? 0;

  return (
    <div className="space-y-8 pb-24">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <Dumbbell className="h-8 w-8" />
          Gym
        </h1>
        <p className="text-muted-foreground">
          Build your memory muscles with spaced repetition practice
        </p>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Start Practice Card */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 md:col-span-2 lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              Start Practice
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Due Count Display */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-4xl font-bold">
                  {isLoadingDue ? (
                    <Loader2 className="h-8 w-8 animate-spin" />
                  ) : (
                    dueCount
                  )}
                </p>
                <p className="text-muted-foreground text-sm">
                  {dueCount === 1 ? "word" : "words"} due for review
                </p>
              </div>
              {totalCount > 0 && (
                <div className="text-right">
                  <p className="text-muted-foreground text-sm">
                    {totalCount} total in VoDex
                  </p>
                  <Progress
                    value={(dueCount / totalCount) * 100}
                    className="mt-1 h-2 w-32"
                  />
                </div>
              )}
            </div>

            {/* Target Count Slider */}
            {dueCount > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Practice size</span>
                  <Badge variant="outline">{targetCount} exercises</Badge>
                </div>
                <Slider
                  value={[targetCount]}
                  onValueChange={(v) => setTargetCount(v[0] ?? 20)}
                  min={5}
                  max={Math.min(50, dueCount)}
                  step={5}
                  className="w-full"
                />
                <p className="text-muted-foreground text-xs">
                  Estimated time: ~{Math.ceil((targetCount * 45) / 60)} minutes
                </p>
              </div>
            )}

            {/* Start Button */}
            <Button
              size="lg"
              className="w-full"
              onClick={handleStartSession}
              disabled={dueCount === 0 || startSession.isPending}
            >
              {startSession.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Preparing exercises...
                </>
              ) : dueCount === 0 ? (
                <>
                  <Clock className="mr-2 h-4 w-4" />
                  No words due - check back later!
                </>
              ) : (
                <>
                  <Dumbbell className="mr-2 h-4 w-4" />
                  Start Practice
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Stats Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5" />
              Your Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingStats ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">Total XP</span>
                  <span className="flex items-center gap-1 font-bold text-amber-600">
                    <Zap className="h-4 w-4" />
                    {stats?.totalXp ?? 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">
                    Practice Sessions
                  </span>
                  <span className="font-medium">{stats?.totalSessions ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">
                    Words Learned
                  </span>
                  <span className="font-medium">{stats?.totalVocab ?? 0}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Practice Types Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Practice Types</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {practiceTypes.map((config) => (
            <Card
              key={config.type}
              className={cn(
                "transition-all",
                !config.available && "opacity-60",
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h3 className="flex items-center gap-2 font-medium">
                      {config.displayName}
                      {!config.available && (
                        <Badge variant="outline" className="text-xs">
                          <Lock className="mr-1 h-3 w-3" />
                          Soon
                        </Badge>
                      )}
                    </h3>
                    <p className="text-muted-foreground text-xs">
                      {config.description}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    Unlocks at {config.requiredStability}d stability
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {config.xpMultiplier}x XP
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Info Section */}
      <Card className="bg-muted/50">
        <CardContent className="p-6">
          <h3 className="mb-2 font-semibold">How it works</h3>
          <ul className="text-muted-foreground space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Words are scheduled using the FSRS algorithm for optimal retention
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Rate yourself honestly: Again, Hard, Good, or Easy
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              New practice types unlock as words become more stable in memory
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Earn XP for each exercise - harder ratings earn less but build
              stronger memories
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

