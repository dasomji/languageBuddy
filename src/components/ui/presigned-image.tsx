"use client";

import { useState, useEffect } from "react";
import { cn } from "~/lib/utils";
import { Loader2 } from "lucide-react";

interface PresignedImageProps {
  src: string;
  alt: string;
  className?: string;
}

export function PresignedImage({ src, alt, className }: PresignedImageProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPresignedUrl() {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/storage/presigned?key=${encodeURIComponent(src)}`);
        
        if (!response.ok) {
          throw new Error("Failed to get presigned URL");
        }
        
        const { url } = await response.json();
        setImageSrc(url);
      } catch (err) {
        console.error("Error fetching presigned URL:", err);
        setError("Failed to load image");
      } finally {
        setIsLoading(false);
      }
    }

    if (src) {
      fetchPresignedUrl();
    }
  }, [src]);

  if (isLoading) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted animate-pulse",
          className
        )}
      >
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !imageSrc) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted text-muted-foreground",
          className
        )}
      >
        <span className="text-sm">Image unavailable</span>
      </div>
    );
  }

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={cn("object-cover", className)}
      loading="lazy"
    />
  );
}

