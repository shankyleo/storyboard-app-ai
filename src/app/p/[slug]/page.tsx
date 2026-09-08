import { notFound } from "next/navigation";
import { Clapperboard } from "lucide-react";
import { PanelImage } from "@/components/panel-image";
import { PrintButton } from "@/components/print-button";
import { getProjectBySlug } from "@/lib/projects";

export default async function PitchPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);

  if (!project || project.beats.length === 0) notFound();

  const beats = [...project.beats].sort((a, b) => a.orderIndex - b.orderIndex);
  const panels = [...project.panels].sort((a, b) => a.orderIndex - b.orderIndex);
  const logline = project.interviewAnswers?.logline ?? "";

  return (
    <div className="min-h-screen bg-[#faf9f7] text-zinc-900 print:bg-white">
      <header className="border-b border-zinc-200/80 bg-white/80 backdrop-blur no-print">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6">
          <span className="flex items-center gap-2 font-semibold text-zinc-800">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-100 text-amber-700">
              <Clapperboard className="h-3.5 w-3.5" />
            </span>
            Storyboard Pitch
          </span>
          <PrintButton />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 print:py-6">
        <section className="mb-12 border-b border-zinc-200 pb-10">
          <p className="text-xs font-medium uppercase tracking-widest text-amber-700">
            Pitch deck
          </p>
          <h1 className="font-display mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
            {project.title}
          </h1>
          {logline && (
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-zinc-600">
              {logline}
            </p>
          )}
        </section>

        <section className="space-y-12">
          {beats.map((beat, index) => {
            const panel = panels[index];
            return (
              <article
                key={beat.id}
                className="break-inside-avoid grid gap-6 md:grid-cols-2 md:items-start"
              >
                <div className="storyboard-frame relative aspect-video overflow-hidden rounded-lg p-2">
                  {panel?.imageUrl ? (
                    <PanelImage
                      src={panel.imageUrl}
                      alt={beat.title}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center rounded-md bg-white/60 text-sm text-zinc-400">
                      Panel pending
                    </div>
                  )}
                </div>
                <div className="pt-1">
                  <p className="text-xs font-medium uppercase tracking-widest text-amber-700">
                    Beat {index + 1}
                  </p>
                  <h2 className="font-display mt-1.5 text-2xl font-semibold tracking-tight">
                    {beat.title}
                  </h2>
                  <p className="mt-3 leading-relaxed text-zinc-600">
                    {beat.description}
                  </p>
                </div>
              </article>
            );
          })}
        </section>
      </main>
    </div>
  );
}
