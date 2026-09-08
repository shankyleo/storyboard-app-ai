"use client";

import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PanelImage } from "@/components/panel-image";

export function PanelImageCarousel({
  imageUrl,
  imageHistory,
  title,
}: {
  imageUrl: string;
  imageHistory: string[];
  title: string;
}) {
  const images = [...imageHistory, imageUrl];
  const [active, setActive] = useState(images.length - 1);
  const touchStart = useRef<number | null>(null);
  const latest = active === images.length - 1;
  const previous = () => setActive((index) => Math.max(0, index - 1));
  const next = () => setActive((index) => Math.min(images.length - 1, index + 1));
  const buttonClass = "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-950/80 text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-default disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400";

  return (
    <div
      className="absolute inset-0 overflow-hidden rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-400"
      role="region"
      aria-roledescription="carousel"
      aria-label={`${title} generations`}
      tabIndex={images.length > 1 ? 0 : undefined}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") { event.preventDefault(); previous(); }
        if (event.key === "ArrowRight") { event.preventDefault(); next(); }
      }}
      onTouchStart={(event) => { touchStart.current = event.touches[0].clientX; }}
      onTouchCancel={() => { touchStart.current = null; }}
      onTouchEnd={(event) => {
        if (touchStart.current === null) return;
        const distance = event.changedTouches[0].clientX - touchStart.current;
        if (distance > 40) previous();
        if (distance < -40) next();
        touchStart.current = null;
      }}
      style={{ touchAction: "pan-y" }}
    >
      <div
        className="relative h-full"
        role="group"
        aria-roledescription="slide"
        aria-label={`Generation ${active + 1} of ${images.length}${latest ? ", latest" : ""}`}
      >
        <PanelImage src={images[active]} alt={`${title} — generation ${active + 1}`} />
      </div>
      {images.length > 1 && (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-between px-3">
            <button type="button" className={`${buttonClass} pointer-events-auto`} onClick={previous} disabled={active === 0} aria-label="Previous generation">
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <button type="button" className={`${buttonClass} pointer-events-auto`} onClick={next} disabled={latest} aria-label="Next generation">
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <div className="absolute inset-x-0 bottom-3 flex justify-center">
            <span className="rounded-full bg-zinc-950/80 px-3 py-1.5 text-xs font-medium text-white shadow-sm" aria-live="polite" aria-atomic="true">
              {latest ? "Latest · " : "Generation "}{active + 1} / {images.length}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
