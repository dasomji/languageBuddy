import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "~/lib/auth";
import { api, HydrateClient } from "~/trpc/server";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Calendar, BookOpen, Library } from "lucide-react";

export default async function Home() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/auth/signin");
  }

  // Prefetch data for the dashboard
  void api.diary.getEntries.prefetch();
  void api.story.getAll.prefetch();
  void api.vodex.getAll.prefetch({ limit: 5 });

  return (
    <HydrateClient>
      <div className="space-y-8 pb-24">
        {/* Welcome Section */}
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back, {session.user.name}!
          </h1>
          <p className="text-muted-foreground">
            Continue your language learning journey
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Diary Entries
              </CardTitle>
              <Calendar className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">--</div>
              <p className="text-muted-foreground text-xs">entries written</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Stories Read
              </CardTitle>
              <BookOpen className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">--</div>
              <p className="text-muted-foreground text-xs">stories completed</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vocabulary</CardTitle>
              <Library className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">--</div>
              <p className="text-muted-foreground text-xs">words learned</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Link href="/diary">
            <Card className="cursor-pointer transition-shadow hover:shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Write Diary Entry
                </CardTitle>
                <CardDescription>
                  Share your day and generate personalized content
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">Start Writing</Button>
              </CardContent>
            </Card>
          </Link>
          <Link href="/stories">
            <Card className="cursor-pointer transition-shadow hover:shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Read a Story
                </CardTitle>
                <CardDescription>
                  Immerse yourself in mini-stories with audio
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant="outline">
                  Browse Stories
                </Button>
              </CardContent>
            </Card>
          </Link>
          <Link href="/vodex">
            <Card className="cursor-pointer transition-shadow hover:shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Library className="h-5 w-5" />
                  VoDex
                </CardTitle>
                <CardDescription>
                  Review your vocabulary and track progress
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant="secondary">
                  Open VoDex
                </Button>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Recent Activity */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Diary Entries</CardTitle>
              <CardDescription>
                Your latest entries and their status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                No diary entries yet. Start writing to see your progress!
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Continue Reading</CardTitle>
              <CardDescription>Pick up where you left off</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                No stories in progress. Browse stories to start reading!
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </HydrateClient>
  );
}
