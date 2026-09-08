import { Film, Layers, Share2, Sparkles } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { startNewProjectAction } from "@/app/actions/project-actions";

export default function HomePage() {
  return (
    <PageShell>
      <section className="py-10 text-center sm:py-16">
        <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium uppercase tracking-widest text-amber-300 ring-1 ring-amber-500/20">
          <Sparkles className="h-3.5 w-3.5" />
          Storyboard MVP
        </p>
        <h1 className="font-display mx-auto max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-[3.25rem]">
          Put your imagination on paper — before you pitch the world
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-lg">
          Answer three quick questions, get a structured beat sheet, generate
          storyboard panels, and share a pitch link or PDF.
        </p>
        <form action={startNewProjectAction} className="mt-10">
          <Button size="lg" type="submit" className="shadow-lg shadow-amber-500/10">
            <Sparkles className="h-4 w-4" />
            Start your story
          </Button>
        </form>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            icon: Sparkles,
            title: "Capture",
            body: "Three guided questions capture your idea and stakes.",
          },
          {
            icon: Layers,
            title: "Structure",
            body: "An editable beat sheet — 8–12 scenes with visual prompts.",
          },
          {
            icon: Film,
            title: "Visualize",
            body: "Storyboard panels render one by one with live progress.",
          },
          {
            icon: Share2,
            title: "Share",
            body: "Public pitch page — print to PDF anytime.",
          },
        ].map(({ icon: Icon, title, body }) => (
          <div key={title} className="surface-card p-5 transition-colors">
            <span className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20">
              <Icon className="h-4 w-4" />
            </span>
            <h2 className="font-medium text-zinc-100">{title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-500">{body}</p>
          </div>
        ))}
      </section>
    </PageShell>
  );
}
