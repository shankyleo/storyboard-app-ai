import Link from "next/link";
import { Clapperboard } from "lucide-react";
import { cn } from "@/lib/utils";

const phases = ["Capture", "Structure", "Visualize", "Share"];

export function PageShell({
  children,
  className,
  activePhase,
}: {
  children: React.ReactNode;
  className?: string;
  activePhase?: number;
}) {
  return (
    <div className={cn("min-h-screen text-zinc-100", className)}>
      <div className="hero-glow pointer-events-none fixed inset-0 -z-10" />
      <header className="sticky top-0 z-50 border-b border-white/8 bg-[#070709]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5 sm:px-6">
          <Link href="/" className="group flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/25 transition group-hover:bg-amber-500/20">
              <Clapperboard className="h-4 w-4" />
            </span>
            <span className="font-display text-lg font-semibold tracking-tight">
              Storyboard
            </span>
          </Link>
          <nav className="hidden items-center gap-1 sm:flex">
            {phases.map((phase, i) => (
              <span
                key={phase}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider",
                  activePhase === i
                    ? "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30"
                    : "text-zinc-500",
                )}
              >
                {phase}
              </span>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        {children}
      </main>
    </div>
  );
}
