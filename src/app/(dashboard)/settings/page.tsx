"use client";

import { useState, useEffect } from "react";
import { api } from "~/trpc/react";
import { cn } from "~/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Slider } from "~/components/ui/slider";
import { Badge } from "~/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Globe, Trash2, Keyboard } from "lucide-react";

function ShortcutInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
}) {
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    if (!isRecording) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onChange(e.key);
      setIsRecording(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isRecording, onChange]);

  return (
    <div className="flex items-center justify-between">
      <Label className="text-sm">{label}</Label>
      <Button
        variant="outline"
        size="sm"
        className={cn(
          "w-32 font-mono",
          isRecording && "border-primary ring-primary ring-2 ring-offset-2",
        )}
        onClick={() => setIsRecording(true)}
      >
        {isRecording ? "Press a key..." : value === " " ? "Space" : value}
      </Button>
    </div>
  );
}

export default function SettingsPage() {
  const [audioDelay, setAudioDelay] = useState(1000);
  const [imageStyle, setImageStyle] = useState("children book watercolors");
  const [shortcuts, setShortcuts] = useState({
    shortcutAudioForward: "a",
    shortcutAudioBack: "d",
    shortcutAudioPlayPause: " ",
    shortcutAudioStop: "s",
    shortcutStoryNext: "ArrowRight",
    shortcutStoryPrev: "ArrowLeft",
    shortcutVodexNext: "ArrowDown",
    shortcutVodexPrev: "ArrowUp",
  });

  const utils = api.useUtils();
  const { data: settings, isLoading } = api.settings.get.useQuery();
  const { data: spaces } = api.learningSpace.list.useQuery();
  const { data: activeSpace } = api.learningSpace.getActive.useQuery();

  const updateSettings = api.settings.update.useMutation({
    onSuccess: () => {
      toast.success("Settings updated successfully");
      utils.settings.get.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update settings");
    },
  });

  const deleteSpaceMutation = api.learningSpace.delete.useMutation({
    onSuccess: () => {
      toast.success("Learning space deleted");
      utils.learningSpace.list.invalidate();
      utils.learningSpace.getActive.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete space");
    },
  });

  useEffect(() => {
    if (settings) {
      setAudioDelay(settings.audioPlaybackDelay);
      setImageStyle(settings.imageStyle);
      setShortcuts({
        shortcutAudioForward: settings.shortcutAudioForward ?? "a",
        shortcutAudioBack: settings.shortcutAudioBack ?? "d",
        shortcutAudioPlayPause: settings.shortcutAudioPlayPause ?? " ",
        shortcutAudioStop: settings.shortcutAudioStop ?? "s",
        shortcutStoryNext: settings.shortcutStoryNext ?? "ArrowRight",
        shortcutStoryPrev: settings.shortcutStoryPrev ?? "ArrowLeft",
        shortcutVodexNext: settings.shortcutVodexNext ?? "ArrowDown",
        shortcutVodexPrev: settings.shortcutVodexPrev ?? "ArrowUp",
      });
    }
  }, [settings]);

  const handleSave = () => {
    updateSettings.mutate({
      audioPlaybackDelay: audioDelay,
      imageStyle,
      ...shortcuts,
    });
  };

  const handleDeleteSpace = (id: string, name: string) => {
    if (
      confirm(
        `Are you sure you want to delete "${name}"? This will permanently delete all diary entries, stories, and vocabulary linked to this space.`,
      )
    ) {
      deleteSpaceMutation.mutate({ id });
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your app preferences and learning experience.
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Learning Spaces</CardTitle>
            <CardDescription>
              Manage your different language learning spaces.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {spaces?.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No learning spaces created yet.
                </p>
              ) : (
                <div className="grid gap-4">
                  {spaces?.map((space) => (
                    <div
                      key={space.id}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div className="flex items-center gap-4">
                        <div className="bg-muted rounded-full p-2">
                          <Globe className="text-muted-foreground h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-medium">
                            {space.name}
                            {activeSpace?.id === space.id && (
                              <Badge className="ml-2" variant="secondary">
                                Active
                              </Badge>
                            )}
                          </div>
                          <p className="text-muted-foreground text-sm">
                            {space.targetLanguage} ({space.level}) • Native:{" "}
                            {space.nativeLanguage}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteSpace(space.id, space.name)}
                        disabled={deleteSpaceMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mini-Story Preferences</CardTitle>
            <CardDescription>
              Configure how your stories are generated and presented.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="audio-delay">Audio Playback Delay (ms)</Label>
                <span className="text-muted-foreground text-sm font-medium">
                  {(audioDelay / 1000).toFixed(1)}s
                </span>
              </div>
              <Slider
                id="audio-delay"
                min={0}
                max={5000}
                step={100}
                value={[audioDelay]}
                onValueChange={(val) => setAudioDelay(val[0] ?? 1000)}
              />
              <p className="text-muted-foreground text-xs">
                Wait time before audio starts playing when you turn a page.
              </p>
            </div>

            <div className="space-y-3">
              <Label htmlFor="image-style">Image Style</Label>
              <Input
                id="image-style"
                value={imageStyle}
                onChange={(e) => setImageStyle(e.target.value)}
                placeholder="e.g. children book watercolors, oil painting, studio Ghibli"
              />
              <p className="text-muted-foreground text-xs">
                The visual style used for generating images in your stories and
                vocabulary.
              </p>
            </div>
          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            <Button onClick={handleSave} disabled={updateSettings.isPending}>
              {updateSettings.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save Changes
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Keyboard className="h-5 w-5" />
              Keyboard Shortcuts
            </CardTitle>
            <CardDescription>
              Customize your learning experience with keyboard controls.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Audio Player</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <ShortcutInput
                  label="Play / Pause"
                  value={shortcuts.shortcutAudioPlayPause}
                  onChange={(val) =>
                    setShortcuts((prev) => ({
                      ...prev,
                      shortcutAudioPlayPause: val,
                    }))
                  }
                />
                <ShortcutInput
                  label="Stop"
                  value={shortcuts.shortcutAudioStop}
                  onChange={(val) =>
                    setShortcuts((prev) => ({
                      ...prev,
                      shortcutAudioStop: val,
                    }))
                  }
                />
                <ShortcutInput
                  label="Forward (1s)"
                  value={shortcuts.shortcutAudioForward}
                  onChange={(val) =>
                    setShortcuts((prev) => ({
                      ...prev,
                      shortcutAudioForward: val,
                    }))
                  }
                />
                <ShortcutInput
                  label="Backward (1s)"
                  value={shortcuts.shortcutAudioBack}
                  onChange={(val) =>
                    setShortcuts((prev) => ({
                      ...prev,
                      shortcutAudioBack: val,
                    }))
                  }
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Mini-Stories</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <ShortcutInput
                  label="Next Page"
                  value={shortcuts.shortcutStoryNext}
                  onChange={(val) =>
                    setShortcuts((prev) => ({
                      ...prev,
                      shortcutStoryNext: val,
                    }))
                  }
                />
                <ShortcutInput
                  label="Previous Page"
                  value={shortcuts.shortcutStoryPrev}
                  onChange={(val) =>
                    setShortcuts((prev) => ({
                      ...prev,
                      shortcutStoryPrev: val,
                    }))
                  }
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold">VoDex</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <ShortcutInput
                  label="Next Word"
                  value={shortcuts.shortcutVodexNext}
                  onChange={(val) =>
                    setShortcuts((prev) => ({
                      ...prev,
                      shortcutVodexNext: val,
                    }))
                  }
                />
                <ShortcutInput
                  label="Previous Word"
                  value={shortcuts.shortcutVodexPrev}
                  onChange={(val) =>
                    setShortcuts((prev) => ({
                      ...prev,
                      shortcutVodexPrev: val,
                    }))
                  }
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            <Button onClick={handleSave} disabled={updateSettings.isPending}>
              {updateSettings.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save Changes
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>
              Manage your account settings and authentication.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Delete Account</p>
                <p className="text-muted-foreground text-sm">
                  Permanently remove your account and all associated data.
                </p>
              </div>
              <Button variant="destructive" asChild>
                <a href="/auth/delete">Delete Account</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
