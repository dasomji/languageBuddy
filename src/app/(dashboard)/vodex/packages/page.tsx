"use client";

import React, { useState } from "react";
import { api } from "~/trpc/react";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Loader2,
  PackagePlus,
  BookOpen,
  Calendar,
  ArrowRight,
  Plus,
} from "lucide-react";
import { NoActiveSpace } from "~/components/learning-space/no-active-space";
import { toast } from "sonner";
import Link from "next/link";
import { Badge } from "~/components/ui/badge";
import { Progress } from "~/components/ui/progress";
import { cn } from "~/lib/utils";

interface Package {
  id: string;
  name: string;
  status: string;
  processedWords: number;
  totalWords: number;
  processingError?: string | null;
  source: string;
  description?: string | null;
  miniStoryId?: string | null;
}

function PackageProgressCard({
  pkg,
  onComplete,
}: {
  pkg: Package;
  onComplete: () => void;
}) {
  const [progress, setProgress] = useState({
    processedWords: pkg.processedWords,
    totalWords: pkg.totalWords,
    status: pkg.status,
    error: pkg.processingError ?? undefined,
  });

  api.vodex.packageProgress.useSubscription(
    { packageId: pkg.id },
    {
      onData: (data) => {
        setProgress({
          processedWords: data.processedWords,
          totalWords: data.totalWords,
          status: data.status,
          error: data.error,
        });
        if (data.status === "completed" || data.status === "error") {
          onComplete();
        }
      },
    },
  );

  const percentage =
    progress.totalWords > 0
      ? Math.round((progress.processedWords / progress.totalWords) * 100)
      : 0;

  return (
    <Card className="border-primary/50 bg-primary/5 flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Loader2 className="text-primary h-4 w-4 animate-spin" />
            <CardTitle className="line-clamp-1 text-base">{pkg.name}</CardTitle>
          </div>
          <Badge variant="outline" className="text-[10px] capitalize">
            {progress.status}
          </Badge>
        </div>
        <CardDescription className="text-xs">
          {progress.status === "error" ? (
            <span className="text-destructive">{progress.error}</span>
          ) : (
            `Processing words: ${progress.processedWords} / ${progress.totalWords}`
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="mt-auto pt-4">
        <div className="space-y-2">
          <Progress value={percentage} className="h-2" />
          <p className="text-muted-foreground text-right text-[10px]">
            {percentage}%
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function WordPacksPage() {
  const [newPackTopic, setNewPackTopic] = useState("");
  const utils = api.useUtils();

  const { data: activeSpace, isLoading: isLoadingSpace } =
    api.learningSpace.getActive.useQuery();

  const { data: packages, isLoading: isLoadingPacks } =
    api.vodex.getPackages.useQuery(undefined, {
      enabled: !!activeSpace,
    });

  const createPackMutation = api.vodex.createPackageFromTopic.useMutation({
    onSuccess: () => {
      toast.success("Vocabulary pack created successfully!");
      setNewPackTopic("");
      void utils.vodex.getPackages.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to create pack: ${error.message}`);
    },
  });

  const handleCreatePack = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPackTopic.trim()) return;
    createPackMutation.mutate({ topic: newPackTopic });
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
    <div className="space-y-8 pb-24">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <PackagePlus className="h-8 w-8" />
          Word Packages
        </h1>
        <p className="text-muted-foreground">
          Generate vocabulary packs for specific topics or browse your existing
          packs
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left: Creation Section */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Create New Pack</CardTitle>
              <CardDescription>
                Describe a topic (e.g., &quot;Dining out&quot;, &quot;Business
                meeting&quot;) to generate a new vocabulary pack.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreatePack} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="topic">Topic</Label>
                  <Input
                    id="topic"
                    placeholder="e.g., Food and Cooking, Calisthenics..."
                    value={newPackTopic}
                    onChange={(e) => setNewPackTopic(e.target.value)}
                    disabled={createPackMutation.isPending}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={
                    createPackMutation.isPending || !newPackTopic.trim()
                  }
                >
                  {createPackMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating Pack...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Generate Pack
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right: Existing Packages List */}
        <div className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Your Packages</h2>
            <Badge variant="secondary">{packages?.length ?? 0} total</Badge>
          </div>

          {isLoadingPacks ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
            </div>
          ) : packages?.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <PackagePlus className="text-muted-foreground mb-4 h-12 w-12" />
                <p className="text-muted-foreground text-center">
                  You haven&apos;t created any word packages yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {packages?.map((pkg) => {
                if (pkg.status === "processing" || pkg.status === "pending") {
                  return (
                    <PackageProgressCard
                      key={pkg.id}
                      pkg={pkg as unknown as Package}
                      onComplete={() =>
                        void utils.vodex.getPackages.invalidate()
                      }
                    />
                  );
                }

                const typedPkg = pkg as unknown as Package;

                return (
                  <Card key={typedPkg.id} className="flex flex-col">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {typedPkg.source === "diary" ? (
                            <Calendar className="h-4 w-4 text-blue-500" />
                          ) : (
                            <PackagePlus className="h-4 w-4 text-green-500" />
                          )}
                          <CardTitle className="line-clamp-1 text-base">
                            {typedPkg.name}
                          </CardTitle>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] capitalize",
                            typedPkg.status === "error" &&
                              "border-destructive text-destructive",
                          )}
                        >
                          {typedPkg.status}
                        </Badge>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-muted-foreground text-[10px]">
                          {typedPkg.processedWords} words
                        </span>
                        <span className="text-muted-foreground text-[10px]">
                          •
                        </span>
                        <Badge
                          variant="secondary"
                          className="h-4 px-1 text-[8px] capitalize"
                        >
                          {typedPkg.source}
                        </Badge>
                      </div>
                      {typedPkg.description && (
                        <CardDescription className="mt-2 line-clamp-2 text-xs">
                          {typedPkg.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="mt-auto pt-4">
                      {typedPkg.status === "error" ? (
                        <p className="text-destructive mb-2 line-clamp-2 text-[10px]">
                          {typedPkg.processingError}
                        </p>
                      ) : null}
                      <div className="flex flex-col gap-2">
                        <Link
                          href={`/vodex?packageId=${typedPkg.id}`}
                          className="w-full"
                        >
                          <Button
                            variant="secondary"
                            size="sm"
                            className="w-full text-xs"
                            disabled={typedPkg.status === "error"}
                          >
                            Open in VoDex
                            <ArrowRight className="ml-2 h-3 w-3" />
                          </Button>
                        </Link>
                        {typedPkg.miniStoryId && (
                          <Link
                            href={`/stories/${typedPkg.miniStoryId}`}
                            className="w-full"
                          >
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full text-xs"
                            >
                              <BookOpen className="mr-2 h-3 w-3" />
                              Read Story
                            </Button>
                          </Link>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
