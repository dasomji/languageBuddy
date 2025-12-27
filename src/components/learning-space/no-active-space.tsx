"use client";

import { Globe, PlusCircle } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { useState } from "react";
import { api } from "~/trpc/react";
import { useRouter } from "next/navigation";

export function NoActiveSpace() {
  const [showNewSpaceDialog, setShowNewSpaceDialog] = useState(false);
  const router = useRouter();
  const utils = api.useUtils();

  // New space form state
  const [newName, setNewName] = useState("");
  const [newTargetLanguage, setNewTargetLanguage] = useState("French");
  const [newNativeLanguage, setNewNativeLanguage] = useState("English");
  const [newLevel, setNewLevel] = useState("A1");

  const createMutation = api.learningSpace.create.useMutation({
    onSuccess: () => {
      utils.learningSpace.list.invalidate();
      utils.learningSpace.getActive.invalidate();
      router.refresh();
      setShowNewSpaceDialog(false);
    },
  });

  const handleCreateSpace = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      name: newName,
      targetLanguage: newTargetLanguage,
      nativeLanguage: newNativeLanguage,
      level: newLevel,
    });
  };

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="rounded-full bg-muted p-6">
        <Globe className="h-12 w-12 text-muted-foreground" />
      </div>
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-bold tracking-tight">No Active Learning Space</h2>
        <p className="text-muted-foreground max-w-md">
          You need a learning space to start your journey. Create your first one
          now to begin writing diary entries and learning vocabulary.
        </p>
      </div>

      <Dialog open={showNewSpaceDialog} onOpenChange={setShowNewSpaceDialog}>
        <DialogTrigger asChild>
          <Button size="lg" className="gap-2">
            <PlusCircle className="h-5 w-5" />
            Create Your First Space
          </Button>
        </DialogTrigger>
        <DialogContent>
          <form onSubmit={handleCreateSpace}>
            <DialogHeader>
              <DialogTitle>Create Learning Space</DialogTitle>
              <DialogDescription>
                Add a new language and level to your learning journey.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Space Name</Label>
                <Input
                  id="name"
                  placeholder="e.g. My French Journey"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="targetLanguage">Target Language</Label>
                  <Select
                    value={newTargetLanguage}
                    onValueChange={setNewTargetLanguage}
                  >
                    <SelectTrigger id="targetLanguage">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="French">French</SelectItem>
                      <SelectItem value="Spanish">Spanish</SelectItem>
                      <SelectItem value="German">German</SelectItem>
                      <SelectItem value="Italian">Italian</SelectItem>
                      <SelectItem value="Japanese">Japanese</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="level">Level</Label>
                  <Select value={newLevel} onValueChange={setNewLevel}>
                    <SelectTrigger id="level">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="A1">A1</SelectItem>
                      <SelectItem value="A2">A2</SelectItem>
                      <SelectItem value="B1">B1</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="nativeLanguage">Native Language</Label>
                <Input
                  id="nativeLanguage"
                  value={newNativeLanguage}
                  onChange={(e) => setNewNativeLanguage(e.target.value)}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowNewSpaceDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Space"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

