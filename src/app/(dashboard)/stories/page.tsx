"use client";

import Link from "next/link";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { PresignedImage } from "~/components/ui/presigned-image";
import { Loader2, BookOpen, Eye, Clock, RefreshCcw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { NoActiveSpace } from "~/components/learning-space/no-active-space";

export default function StoriesPage() {
  const { data: activeSpace, isLoading: isLoadingSpace } =
    api.learningSpace.getActive.useQuery();

  const { data: storiesData, isLoading } = api.story.getAll.useQuery(
    {},
    {
      enabled: !!activeSpace,
    },
  );
  const { data: stats } = api.story.getStats.useQuery(undefined, {
    enabled: !!activeSpace,
  });

  if (isLoading || isLoadingSpace) {
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
          <BookOpen className="h-8 w-8" />
          Mini-Stories
        </h1>
        <p className="text-muted-foreground">
          Read interactive stories with audio to learn vocabulary in context
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Total Stories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalStories ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.completedStories ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Total Reads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-2xl font-bold">
              <RefreshCcw className="h-4 w-4" />
              {stats?.totalReads ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Total Opens
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-2xl font-bold">
              <Eye className="h-4 w-4" />
              {stats?.totalOpens ?? 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stories Grid */}
      {storiesData?.stories.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="text-muted-foreground mb-4 h-12 w-12" />
            <h3 className="mb-2 text-lg font-semibold">No stories yet</h3>
            <p className="text-muted-foreground mb-4 text-center">
              Write your first diary entry to generate your first mini-story!
            </p>
            <Link href="/diary">
              <Button>Write Diary Entry</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {storiesData?.stories.map((story) => (
            <Link key={story.id} href={`/stories/${story.id}`}>
              <Card className="h-full cursor-pointer transition-shadow hover:shadow-lg">
                <div className="bg-muted aspect-video w-full overflow-hidden rounded-t-lg">
                  {story.coverImageKey ? (
                    <PresignedImage
                      src={story.coverImageKey}
                      alt={story.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <BookOpen className="text-muted-foreground h-12 w-12" />
                    </div>
                  )}
                </div>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="line-clamp-1 text-lg">
                      {story.title}
                    </CardTitle>
                    <Badge variant="outline">{story.languageLevel}</Badge>
                  </div>
                  <CardDescription className="line-clamp-2">
                    {story.fullTextNative?.substring(0, 100)}...
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-muted-foreground flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1">
                      <RefreshCcw className="h-4 w-4" />
                      <span>{story.readCount ?? 0} reads</span>
                    </div>
                    {story.lastOpenedAt && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>
                          {formatDistanceToNow(new Date(story.lastOpenedAt), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                  {story.currentPage && story.currentPage > 1 && (
                    <div className="mt-2 text-sm">
                      <span className="text-primary">
                        Continue on page {story.currentPage}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
