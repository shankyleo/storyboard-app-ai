"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { ExternalLink, Loader2 } from "lucide-react";
import {
  generatePanelsAction,
  getPanelProgressAction,
} from "@/app/actions/project-actions";
import { PanelImageCarousel } from "@/components/panel-image-carousel";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  IMAGE_PROVIDER_LABELS,
  type ImageProvider,
} from "@/lib/image-providers";

type PanelRow = {
  id: string;
  orderIndex: number;
  status: string;
  imageUrl: string | null;
  imageHistory: string[];
  errorMessage: string | null;
};

type BeatRow = {
  title: string;
  description: string;
};

export function PanelProgress({
  projectId,
  slug,
  initialPanels,
  initialStatus,
  beats,
  availableProviders,
  defaultProvider,
  savedImageProvider,
}: {
  projectId: string;
  slug: string;
  initialPanels: PanelRow[];
  initialStatus: string;
  beats: BeatRow[];
  availableProviders: ImageProvider[];
  defaultProvider: ImageProvider | null;
  savedImageProvider: ImageProvider | null;
}) {
  const [panels, setPanels] = useState(initialPanels);
  const [status, setStatus] = useState(initialStatus);
  const [selectedProvider, setSelectedProvider] = useState<ImageProvider | null>(
    savedImageProvider ?? defaultProvider,
  );
  const [isGenerating, startGenerate] = useTransition();
  const done = panels.filter((p) => p.status === "done").length;
  const failed = panels.filter((p) => p.status === "failed").length;
  const total = panels.length;
  const finished = done + failed;
  const percent = total === 0 ? 0 : Math.round((finished / total) * 100);
  const isComplete = status === "ready" && finished === total && total > 0;
  const canRetryFailedPanels = failed > 0 && status === "ready";
  const canRegenerateAllPanels = done > 0 && status === "ready";
  const needsGeneration = panels.some((p) => p.status === "pending");
  const isInProgress = panels.some(
    (p) => p.status === "generating" || p.status === "done" || p.status === "failed",
  );
  const providerError = panels.find(
    (p) =>
      p.errorMessage?.includes("billing") ||
      p.errorMessage?.includes("quota") ||
      p.errorMessage?.includes("rate limit"),
  )?.errorMessage;

  useEffect(() => {
    if (isComplete && !isGenerating) return;

    const interval = setInterval(async () => {
      const progress = await getPanelProgressAction(projectId);
      if (!progress) return;
      setPanels(progress.panels);
      setStatus(progress.status);
    }, 800);

    return () => clearInterval(interval);
  }, [projectId, isGenerating, isComplete]);

  function handleGenerate(generationMode: "failed" | "all" = "failed") {
    startGenerate(() =>
      generatePanelsAction(
        projectId,
        selectedProvider ?? undefined,
        generationMode,
      ),
    );
  }

  return (
    <PageShell activePhase={2}>
      <div className="mb-8">
        <Link
          href={`/project/${projectId}/beats`}
          className="text-sm text-zinc-500 transition hover:text-zinc-300"
        >
          ← Back to beats
        </Link>
        <h1 className="font-display mt-2 text-3xl font-semibold tracking-tight">
          Your storyboard
        </h1>
        <p className="mt-1 text-zinc-400">
          Each beat becomes a panel — sketches appear as they render.
        </p>
      </div>

      <div className="surface-card mb-8 p-6">
        {((needsGeneration && !isInProgress) || canRetryFailedPanels ||
          canRegenerateAllPanels) && (
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end">
            {availableProviders.length > 0 ? (
              <div className="flex-1">
                <Label htmlFor="image-provider">Image provider</Label>
                <select
                  id="image-provider"
                  value={selectedProvider ?? ""}
                  onChange={(event) =>
                    setSelectedProvider(event.target.value as ImageProvider)
                  }
                  className="mt-1.5 flex h-11 w-full rounded-lg border border-white/10 bg-white/4 px-3.5 py-2 text-sm text-zinc-100 transition focus-visible:border-amber-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/20"
                >
                  {availableProviders.map((provider) => (
                    <option key={provider} value={provider}>
                      {IMAGE_PROVIDER_LABELS[provider]}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <p className="flex-1 text-sm text-zinc-400">
                No image API keys configured — placeholder sketches will be used.
              </p>
            )}
            {(needsGeneration || canRetryFailedPanels) && (
              <Button
                type="button"
                onClick={() => handleGenerate()}
                disabled={isGenerating}
                className="w-full sm:w-auto"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Starting…
                  </>
                ) : (
                  canRetryFailedPanels ? "Retry failed panels" : "Generate panels"
                )}
              </Button>
            )}
            {canRegenerateAllPanels && (
              <Button
                type="button"
                onClick={() => handleGenerate("all")}
                disabled={isGenerating}
                className="w-full sm:w-auto"
              >
                Regenerate all panels
              </Button>
            )}
          </div>
        )}

        {savedImageProvider && isInProgress && (
          <p className="mb-3 text-xs text-zinc-500">
            Using {IMAGE_PROVIDER_LABELS[savedImageProvider]}
          </p>
        )}

        <div className="mb-3 flex justify-between text-sm">
          <span className="font-medium text-zinc-300">
            {done} of {total} panels
            {failed > 0 && (
              <span className="ml-2 text-red-400">({failed} failed)</span>
            )}
          </span>
          <span className="text-zinc-500">{percent}%</span>
        </div>
        <Progress value={percent} />
        {providerError && (
          <p className="mt-4 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
            {providerError}
          </p>
        )}
        {(isGenerating || (needsGeneration && isInProgress)) && !isComplete && (
          <p className="mt-4 flex items-center gap-2 text-sm text-zinc-400">
            <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
            Drawing panels… Rate limits are retried automatically; a panel can take up to 10 minutes.
          </p>
        )}
        {isComplete && done > 0 && (
          <div className="mt-5 flex gap-3 no-print">
            <Button asChild>
              <Link href={`/p/${slug}`}>
                <ExternalLink className="h-4 w-4" />
                View pitch page
              </Link>
            </Button>
          </div>
        )}
      </div>

      {total === 0 ? (
        <p className="text-zinc-500">
          No panels yet — go back and generate from your beat sheet.
        </p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {panels.map((panel, index) => {
            const beat = beats[index];
            return (
              <article
                key={panel.id}
                className="surface-card overflow-hidden"
              >
                <div className="storyboard-frame relative aspect-video p-3">
                  {panel.imageUrl ? (
                    <PanelImageCarousel
                      key={`${panel.id}-${panel.imageHistory.length}-${panel.imageUrl}`}
                      imageUrl={panel.imageUrl}
                      imageHistory={panel.imageHistory}
                      title={beat?.title ?? `Panel ${index + 1}`}
                    />
                  ) : panel.status === "failed" ? (
                    <div className="flex h-full flex-col items-center justify-center gap-2 rounded-md bg-red-950/20 px-4 text-center text-red-300">
                      <span className="text-sm font-medium">Generation failed</span>
                      {panel.errorMessage && (
                        <span className="text-xs leading-relaxed text-red-400/90">
                          {panel.errorMessage}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-2 rounded-md bg-white/50 text-zinc-500">
                      {panel.status === "generating" ? (
                        <>
                          <Loader2 className="h-7 w-7 animate-spin text-amber-500" />
                          <span className="text-sm">Drawing sketch…</span>
                        </>
                      ) : (
                        <span className="text-sm">Waiting…</span>
                      )}
                    </div>
                  )}
                </div>
                <div className="border-t border-white/6 px-4 py-3.5">
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-amber-500/15 text-[10px] font-bold text-amber-300">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-zinc-200">
                        {beat?.title ?? `Panel ${index + 1}`}
                      </p>
                      {beat?.description && (
                        <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">
                          {beat.description}
                        </p>
                      )}
                    </div>
                  </div>

                </div>
              </article>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
