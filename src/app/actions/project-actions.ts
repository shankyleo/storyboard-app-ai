"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { generateBeatSheet } from "@/lib/llm";
import { runPanelGenerationBatch } from "@/lib/panels";
import { isImageProvider } from "@/lib/image-providers";
import {
  assertProjectAccess,
  createProject,
  getProjectById,
  initPanelGeneration,
  markProjectReady,
  saveBeatSheet,
  saveImageProvider,
  saveInterviewAnswers,
  updateBeat,
  updatePanel,
} from "@/lib/projects";
import { ensureSessionId } from "@/lib/session";

export async function startNewProjectAction() {
  const sessionId = await ensureSessionId();
  const project = await createProject(sessionId);
  redirect(`/project/${project.id}/interview`);
}

export async function saveInterviewStepAction(
  projectId: string,
  answers: Record<string, string>,
) {
  const sessionId = await ensureSessionId();
  const project = await assertProjectAccess(projectId, sessionId);
  if (!project) throw new Error("Unauthorized");

  await saveInterviewAnswers(projectId, answers);
  revalidatePath(`/project/${projectId}/interview`);
}

export async function generateBeatsAction(projectId: string) {
  const sessionId = await ensureSessionId();
  const project = await assertProjectAccess(projectId, sessionId);
  if (!project) throw new Error("Unauthorized");

  const answers = project.interviewAnswers ?? {};
  const beatSheet = await generateBeatSheet(answers);
  await saveBeatSheet(projectId, beatSheet);
  const saved = await getProjectById(projectId);
  if (!saved || saved.beats.length === 0) {
    throw new Error("Beat sheet did not save");
  }
  revalidatePath(`/project/${projectId}/beats`);
  redirect(`/project/${projectId}/beats`);
}

export async function updateBeatAction(
  projectId: string,
  beatId: string,
  formData: FormData,
) {
  const sessionId = await ensureSessionId();
  const project = await assertProjectAccess(projectId, sessionId);
  if (!project) throw new Error("Unauthorized");

  await updateBeat(projectId, beatId, {
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    visualPrompt: String(formData.get("visualPrompt") ?? ""),
  });
  revalidatePath(`/project/${projectId}/beats`);
}

export async function startPanelGenerationAction(projectId: string) {
  const sessionId = await ensureSessionId();
  const project = await assertProjectAccess(projectId, sessionId);
  if (!project) throw new Error("Unauthorized");

  await initPanelGeneration(projectId);
  revalidatePath(`/project/${projectId}/panels`);
  redirect(`/project/${projectId}/panels`);
}

export async function generatePanelsAction(
  projectId: string,
  imageProviderInput?: string,
  generationMode: "failed" | "all" = "failed",
) {
  const sessionId = await ensureSessionId();
  const project = await assertProjectAccess(projectId, sessionId);
  if (!project) throw new Error("Unauthorized");

  const imageProvider =
    imageProviderInput && isImageProvider(imageProviderInput)
      ? imageProviderInput
      : project.imageProvider;

  if (imageProvider) {
    await saveImageProvider(projectId, imageProvider);
  }

  let current = await getProjectById(projectId);
  if (!current || current.panels.length === 0) {
    current = (await initPanelGeneration(projectId)) ?? current;
  }
  if (!current) throw new Error("Project not found");

  const sortedPanels = [...current.panels].sort(
    (a, b) => a.orderIndex - b.orderIndex,
  );
  const sortedBeats = [...current.beats].sort(
    (a, b) => a.orderIndex - b.orderIndex,
  );
  const generationJobs = sortedPanels
    .map((panel, index) => ({ panel, beat: sortedBeats[index] }))
    .filter(
      (
        job,
      ): job is { panel: (typeof sortedPanels)[number]; beat: (typeof sortedBeats)[number] } =>
        Boolean(job.beat) &&
        (generationMode === "all" || job.panel.status !== "done"),
    );

  // Use the full board even on failed-only retries, so the visual context stays fixed.
  const continuity = [
    `Story: ${current.title}`,
    ...Object.entries(current.interviewAnswers ?? {}).map(([key, value]) => `${key}: ${value}`),
    "Story sequence (context only; render just the requested scene):",
    ...sortedBeats.map((beat, index) => `${index + 1}. ${beat.description} Visual details: ${beat.visualPrompt}`),
    "Maintain recurring characters' face, age, hair, clothing and identifying props throughout. Preserve location design and the same drawing medium. Scene instructions describe action, not a change of art style.",
  ].join("\n");

  await runPanelGenerationBatch(
    generationJobs.map(({ beat }) => ({
      visualPrompt: `${continuity}\n\nRENDER ONLY THIS SCENE: ${beat.title}. ${beat.description}\n${beat.visualPrompt}`,
      beatTitle: beat.title,
    })),
    async (index, result) => {
      const panel = generationJobs[index]?.panel;
      if (!panel) return;
      if (result.ok) {
        const imageHistory = panel.imageUrl
          ? [...(panel.imageHistory ?? []), panel.imageUrl]
          : panel.imageHistory ?? [];
        await updatePanel(projectId, panel.id, {
          status: "done",
          imageUrl: result.imageUrl,
          imageHistory,
          errorMessage: null,
        });
      } else {
        await updatePanel(projectId, panel.id, {
          status: panel.imageUrl ? "done" : "failed",
          imageUrl: panel.imageUrl,
          errorMessage: result.error,
        });
      }
      revalidatePath(`/project/${projectId}/panels`);
    },
    async (index) => {
      const panel = generationJobs[index]?.panel;
      if (!panel) return;
      await updatePanel(projectId, panel.id, { status: "generating" });
      revalidatePath(`/project/${projectId}/panels`);
    },
    imageProvider,
  );

  await markProjectReady(projectId);
  revalidatePath(`/project/${projectId}/panels`);
  revalidatePath(`/p/${current.slug}`);
}

export async function getPanelProgressAction(projectId: string) {
  const sessionId = await ensureSessionId();
  const project = await assertProjectAccess(projectId, sessionId);
  if (!project) return null;

  const total = project.panels.length;
  const done = project.panels.filter((p) => p.status === "done").length;
  const generating = project.panels.some((p) => p.status === "generating");
  return {
    total,
    done,
    percent: total === 0 ? 0 : Math.round((done / total) * 100),
    status: project.status,
    generating,
    panels: project.panels.sort((a, b) => a.orderIndex - b.orderIndex),
  };
}
