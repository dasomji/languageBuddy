"use client";

import { useRef, useState, useEffect } from "react";
import { Button } from "~/components/ui/button";
import { Slider } from "~/components/ui/slider";
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useKeyboardShortcut } from "~/hooks/use-keyboard-shortcut";

interface AudioPlayerProps {
  src: string;
  autoPlay?: boolean;
  onEnded?: () => void;
  delay?: number; // Delay in milliseconds before playing
  shortcuts?: {
    forward?: string;
    back?: string;
    playPause?: string;
    stop?: string;
  };
  enableShortcuts?: boolean;
}

export function AudioPlayer({
  src,
  autoPlay = false,
  onEnded,
  delay = 0,
  shortcuts,
  enableShortcuts = false,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    const handleEnded = () => {
      setIsPlaying(false);
      onEnded?.();
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);

    // Set initial volume
    audio.volume = volume;

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [onEnded, volume]);

  const lastSrcRef = useRef<string | null>(null);

  useEffect(() => {
    if (autoPlay && src) {
      const isNewSrc = lastSrcRef.current !== src;
      const actualDelay = isNewSrc ? delay : 0;

      const timer = setTimeout(() => {
        void audioRef.current?.play().catch((err) => {
          console.warn("Audio play failed:", err);
        });
      }, actualDelay);

      lastSrcRef.current = src;
      return () => clearTimeout(timer);
    }

    if (src) {
      lastSrcRef.current = src;
    }
  }, [autoPlay, src, delay]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      try {
        await audio.play();
      } catch (err) {
        console.error("Failed to play audio:", err);
      }
    }
  };

  const handleStop = () => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    audio.currentTime = 0;
    setIsPlaying(false);
  };

  const skipBack = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(
        0,
        audioRef.current.currentTime - 1,
      );
    }
  };

  const skipForward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.min(
        duration,
        audioRef.current.currentTime + 1,
      );
    }
  };

  useKeyboardShortcut(
    shortcuts?.playPause ?? " ",
    togglePlay,
    enableShortcuts && !!shortcuts?.playPause,
  );
  useKeyboardShortcut(
    shortcuts?.stop ?? "s",
    handleStop,
    enableShortcuts && !!shortcuts?.stop,
  );
  useKeyboardShortcut(
    shortcuts?.forward ?? "a",
    skipForward,
    enableShortcuts && !!shortcuts?.forward,
  );
  useKeyboardShortcut(
    shortcuts?.back ?? "d",
    skipBack,
    enableShortcuts && !!shortcuts?.back,
  );

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0] ?? 0.5;
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleSeek = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0] ?? 0;
      setCurrentTime(value[0] ?? 0);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex w-full flex-col gap-2">
      <audio ref={audioRef} src={src} preload="metadata" />

      <div className="flex flex-wrap items-center gap-2 sm:gap-4">
        {/* Playback Controls */}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            onClick={skipBack}
            className="h-8 w-8"
            title="Back 1s"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={togglePlay}
            className="h-8 w-8"
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={handleStop}
            className="h-8 w-8"
            title="Stop"
          >
            <Square className="h-4 w-4 fill-current" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={skipForward}
            className="h-8 w-8"
            title="Forward 1s"
          >
            <RotateCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Seek Slider */}
        <div className="flex min-w-[150px] flex-1 items-center gap-2">
          <span className="text-muted-foreground w-10 text-right text-xs">
            {formatTime(currentTime)}
          </span>
          <Slider
            value={[currentTime]}
            max={duration || 100}
            step={0.1}
            onValueChange={handleSeek}
            className="flex-1"
          />
          <span className="text-muted-foreground w-10 text-xs">
            {formatTime(duration)}
          </span>
        </div>

        {/* Volume Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleMute}
            className="h-8 w-8"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
