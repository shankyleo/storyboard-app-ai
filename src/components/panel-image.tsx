"use client";

import Image from "next/image";

export function PanelImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const isSketch = src.startsWith("data:");
  const classes = className ?? (isSketch ? "object-contain" : "object-cover");

  if (isSketch) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className={`absolute inset-0 h-full w-full rounded-sm ${classes}`}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      className={`rounded-sm ${classes}`}
      unoptimized
    />
  );
}
