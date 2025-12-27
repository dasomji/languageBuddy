"use client";

import { useState, useEffect } from "react";
import { api } from "~/trpc/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Slider } from "~/components/ui/slider";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function SettingsPage() {
  const [audioDelay, setAudioDelay] = useState(1000);
  const [imageStyle, setImageStyle] = useState("children book watercolors");

  const { data: settings, isLoading } = api.settings.get.useQuery();
  const updateSettings = api.settings.update.useMutation({
    onSuccess: () => {
      toast.success("Settings updated successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update settings");
    },
  });

  useEffect(() => {
    if (settings) {
      setAudioDelay(settings.audioPlaybackDelay);
      setImageStyle(settings.imageStyle);
    }
  }, [settings]);

  const handleSave = () => {
    updateSettings.mutate({
      audioPlaybackDelay: audioDelay,
      imageStyle,
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
            <CardTitle>Mini-Story Preferences</CardTitle>
            <CardDescription>
              Configure how your stories are generated and presented.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="audio-delay">Audio Playback Delay (ms)</Label>
                <span className="text-sm font-medium text-muted-foreground">
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
              <p className="text-xs text-muted-foreground">
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
              <p className="text-xs text-muted-foreground">
                The visual style used for generating images in your stories and vocabulary.
              </p>
            </div>
          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            <Button 
              onClick={handleSave} 
              disabled={updateSettings.isPending}
            >
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
                <p className="text-sm text-muted-foreground">
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

