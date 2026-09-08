"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import {
  generateBeatsAction,
  saveInterviewStepAction,
} from "@/app/actions/project-actions";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { interviewQuestions } from "@/lib/beats";
import { cn } from "@/lib/utils";

export function InterviewWizard({
  projectId,
  initialAnswers,
}: {
  projectId: string;
  initialAnswers: Record<string, string>;
}) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState(initialAnswers);
  const [isPending, startTransition] = useTransition();
  const [isGenerating, startGenerate] = useTransition();

  const question = interviewQuestions[step];
  const value = answers[question.id] ?? "";
  const isLast = step === interviewQuestions.length - 1;

  function updateValue(next: string) {
    setAnswers((prev) => ({ ...prev, [question.id]: next }));
  }

  function persistAndGo(nextStep: number) {
    startTransition(async () => {
      await saveInterviewStepAction(projectId, answers);
      setStep(nextStep);
    });
  }

  function handleNext() {
    if (!value.trim()) return;
    if (isLast) {
      startGenerate(async () => {
        await saveInterviewStepAction(projectId, answers);
        await generateBeatsAction(projectId);
      });
      return;
    }
    persistAndGo(step + 1);
  }

  function handleBack() {
    if (step === 0) return;
    persistAndGo(step - 1);
  }

  return (
    <PageShell activePhase={0}>
      <form
        action={generateBeatsAction.bind(null, projectId)}
        className="hidden"
        aria-hidden="true"
      >
        <button type="submit" tabIndex={-1}>
          Generate beat sheet
        </button>
      </form>
      <div className="mb-8 flex items-center justify-between text-sm">
        <Link href="/" className="text-zinc-500 transition hover:text-zinc-300">
          ← Home
        </Link>
        <span className="text-zinc-500">
          {step + 1} / {interviewQuestions.length}
        </span>
      </div>

      <div className="mx-auto max-w-xl">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Story interview
        </h1>
        <p className="mt-2 text-zinc-400">
          Three quick questions — then we&apos;ll build your beat sheet and
          storyboard.
        </p>

        <div className="mt-8 flex gap-2">
          {interviewQuestions.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors",
                i <= step ? "bg-amber-400" : "bg-white/10",
              )}
            />
          ))}
        </div>

        <div className="surface-card mt-6 space-y-4 p-6 sm:p-8">
          <Label htmlFor={question.id} className="text-base text-zinc-200">
            {question.label}
          </Label>
          {question.type === "textarea" ? (
            <Textarea
              id={question.id}
              value={value}
              onChange={(e) => updateValue(e.target.value)}
              placeholder={question.placeholder}
              disabled={isPending || isGenerating}
              className="min-h-[140px] text-base"
            />
          ) : (
            <Input
              id={question.id}
              value={value}
              onChange={(e) => updateValue(e.target.value)}
              placeholder={question.placeholder}
              disabled={isPending || isGenerating}
              className="text-base"
            />
          )}
        </div>

        <div className="mt-6 flex justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            disabled={step === 0 || isPending || isGenerating}
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>
          <Button
            type="button"
            onClick={handleNext}
            disabled={!value.trim() || isPending || isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating beats…
              </>
            ) : isLast ? (
              "Generate beat sheet"
            ) : (
              <>
                Next
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
