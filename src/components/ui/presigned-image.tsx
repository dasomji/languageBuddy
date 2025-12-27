"use client";

import { cn } from "~/lib/utils";

interface PresignedImageProps {
  src: string;
  alt: string;
  className?: string;
}

export function PresignedImage({ src, alt, className }: PresignedImageProps) {
  return (
    <img
      src={`/api/storage/presigned?key=${encodeURIComponent(src)}&redirect=true`}
      alt={alt}
      className={cn("object-cover", className)}
      loading="lazy"
    />
  );
}

