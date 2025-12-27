"use client";

import * as React from "react";
import { Check, ChevronsUpDown, PlusCircle, Globe } from "lucide-react";

import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "~/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { api } from "~/trpc/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { useRouter } from "next/navigation";

export function LearningSpaceSwitcher() {
  const [open, setOpen] = React.useState(false);
  const [showNewSpaceDialog, setShowNewSpaceDialog] = React.useState(false);
  const router = useRouter();

  const utils = api.useUtils();
  const { data: spaces = [] } = api.learningSpace.list.useQuery();
  const { data: activeSpace } = api.learningSpace.getActive.useQuery();

  const setActiveMutation = api.learningSpace.setActive.useMutation({
    onSuccess: () => {
      utils.learningSpace.getActive.invalidate();
      utils.diary.getEntries.invalidate();
      utils.story.getAll.invalidate();
      utils.vodex.getAll.invalidate();
      utils.vodex.getStats.invalidate();
      router.refresh();
      setOpen(false);
    },
  });

  const createMutation = api.learningSpace.create.useMutation({
    onSuccess: () => {
      utils.learningSpace.list.invalidate();
      utils.learningSpace.getActive.invalidate();
      setShowNewSpaceDialog(false);
    },
  });

  // New space form state
  const [newName, setNewName] = React.useState("");
  const [newTargetLanguage, setNewTargetLanguage] = React.useState("French");
  const [newNativeLanguage, setNewNativeLanguage] = React.useState("English");
  const [newLevel, setNewLevel] = React.useState("A1");

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
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label="Select a learning space"
            className="w-full justify-between"
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <Globe className="h-4 w-4 shrink-0" />
              <span className="truncate">
                {activeSpace ? activeSpace.name : "Select space..."}
              </span>
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0">
          <Command>
            <CommandList>
              <CommandInput placeholder="Search space..." />
              <CommandEmpty>No space found.</CommandEmpty>
              <CommandGroup heading="Your Spaces">
                {spaces.map((space) => (
                  <CommandItem
                    key={space.id}
                    onSelect={() => {
                      setActiveMutation.mutate({ id: space.id });
                    }}
                    className="text-sm"
                  >
                    <Globe className="mr-2 h-4 w-4" />
                    <div className="flex flex-col">
                      <span>{space.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {space.targetLanguage} ({space.level})
                      </span>
                    </div>
                    <Check
                      className={cn(
                        "ml-auto h-4 w-4",
                        activeSpace?.id === space.id
                          ? "opacity-100"
                          : "opacity-0",
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
            <CommandSeparator />
            <CommandList>
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    setOpen(false);
                    setShowNewSpaceDialog(true);
                  }}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create New Space
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Dialog open={showNewSpaceDialog} onOpenChange={setShowNewSpaceDialog}>
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
    </>
  );
}

