"use client";

import Link from "next/link";
import {
  startPanelGenerationAction,
  updateBeatAction,
} from "@/app/actions/project-actions";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Beat = {
  id: string;
  orderIndex: number;
  title: string;
  description: string;
  visualPrompt: string;
};

export function BeatEditor({
  projectId,
  title,
  beats,
}: {
  projectId: string;
  title: string;
  beats: Beat[];
}) {
  return (
    <PageShell activePhase={1}>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/"
            className="text-sm text-zinc-500 transition hover:text-zinc-300"
          >
            ← Home
          </Link>
          <h1 className="font-display mt-2 text-3xl font-semibold tracking-tight">
            {title}
          </h1>
          <p className="mt-1 text-zinc-400">
            Edit your beat sheet, then generate panels.
          </p>
        </div>
        <form action={startPanelGenerationAction.bind(null, projectId)}>
          <Button type="submit" disabled={beats.length === 0} className="w-full sm:w-auto">
            Generate storyboard
          </Button>
        </form>
      </div>

      <div className="space-y-5">
        {beats.map((beat, index) => (
          <form
            key={beat.id}
            action={updateBeatAction.bind(null, projectId, beat.id)}
            className="surface-card p-5 sm:p-6"
          >
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-amber-500/15 text-xs font-semibold text-amber-300 ring-1 ring-amber-500/25">
                {index + 1}
              </span>
              <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">
                Beat {index + 1}
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor={`title-${beat.id}`}>Title</Label>
                <Input
                  id={`title-${beat.id}`}
                  name="title"
                  defaultValue={beat.title}
                />
              </div>
              <div>
                <Label htmlFor={`desc-${beat.id}`}>Description</Label>
                <Textarea
                  id={`desc-${beat.id}`}
                  name="description"
                  defaultValue={beat.description}
                  rows={4}
                  className="min-h-[120px]"
                />
              </div>
              <div>
                <Label htmlFor={`visual-${beat.id}`}>Visual prompt</Label>
                <Textarea
                  id={`visual-${beat.id}`}
                  name="visualPrompt"
                  defaultValue={beat.visualPrompt}
                  className="min-h-[88px]"
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end border-t border-white/6 pt-4">
              <Button type="submit" variant="secondary" size="sm">
                Save beat
              </Button>
            </div>
          </form>
        ))}
      </div>
    </PageShell>
  );
}
