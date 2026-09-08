import { asc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { memoryStore } from "@/lib/memory-store";
import type { BeatSheet } from "@/lib/beats";
import { generateSlug } from "@/lib/session";
import type { ImageProvider } from "@/lib/image-providers";

export type ProjectWithRelations = {
  id: string;
  sessionId: string;
  title: string;
  slug: string;
  status: "interview" | "beats" | "generating" | "ready";
  imageProvider: ImageProvider | null;
  interviewAnswers: Record<string, string> | null;
  createdAt: Date;
  updatedAt: Date;
  beats: {
    id: string;
    projectId: string;
    orderIndex: number;
    title: string;
    description: string;
    visualPrompt: string;
    createdAt: Date;
  }[];
  panels: {
    id: string;
    projectId: string;
    beatId: string;
    orderIndex: number;
    status: "pending" | "generating" | "done" | "failed";
    imageUrl: string | null;
    imageHistory: string[];
    errorMessage: string | null;
    createdAt: Date;
    updatedAt: Date;
  }[];
};

function mapMemoryProject(project: ReturnType<typeof memoryStore.getProject>) {
  if (!project) return null;
  return {
    id: project.id,
    sessionId: project.sessionId,
    title: project.title,
    slug: project.slug,
    status: project.status,
    imageProvider: project.imageProvider ?? null,
    interviewAnswers: project.interviewAnswers,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    beats: project.beats,
    panels: project.panels.map((panel) => ({
      ...panel,
      imageHistory: panel.imageHistory ?? [],
    })),
  } satisfies ProjectWithRelations;
}

export async function createProject(sessionId: string, title?: string) {
  const db = getDb();
  if (!db) {
    return mapMemoryProject(memoryStore.createProject(sessionId, title))!;
  }

  const slug = generateSlug(title ?? "Untitled Story");
  const [project] = await db
    .insert(schema.projects)
    .values({
      sessionId,
      title: title ?? "Untitled Story",
      slug,
      status: "interview",
      interviewAnswers: {},
    })
    .returning();

  return {
    ...project,
    imageProvider: project.imageProvider ?? null,
    interviewAnswers: (project.interviewAnswers as Record<string, string>) ?? {},
    beats: [],
    panels: [],
  } satisfies ProjectWithRelations;
}

export async function getProjectById(id: string): Promise<ProjectWithRelations | null> {
  const db = getDb();
  if (!db) {
    return mapMemoryProject(memoryStore.getProject(id));
  }

  const project = await db.query.projects.findFirst({
    where: eq(schema.projects.id, id),
    with: {
      beats: { orderBy: [asc(schema.beats.orderIndex)] },
      panels: { orderBy: [asc(schema.panels.orderIndex)] },
    },
  });

  if (!project) return null;
  return {
    ...project,
    imageProvider: project.imageProvider ?? null,
    interviewAnswers: (project.interviewAnswers as Record<string, string>) ?? {},
  };
}

export async function getProjectBySlug(
  slug: string,
): Promise<ProjectWithRelations | null> {
  const db = getDb();
  if (!db) {
    return mapMemoryProject(memoryStore.getProjectBySlug(slug));
  }

  const project = await db.query.projects.findFirst({
    where: eq(schema.projects.slug, slug),
    with: {
      beats: { orderBy: [asc(schema.beats.orderIndex)] },
      panels: { orderBy: [asc(schema.panels.orderIndex)] },
    },
  });

  if (!project) return null;
  return {
    ...project,
    imageProvider: project.imageProvider ?? null,
    interviewAnswers: (project.interviewAnswers as Record<string, string>) ?? {},
  };
}

export async function saveInterviewAnswers(
  projectId: string,
  answers: Record<string, string>,
) {
  const db = getDb();
  if (!db) {
    memoryStore.updateProject(projectId, { interviewAnswers: answers });
    return;
  }

  await db
    .update(schema.projects)
    .set({ interviewAnswers: answers, updatedAt: new Date() })
    .where(eq(schema.projects.id, projectId));
}

export async function saveBeatSheet(projectId: string, beatSheet: BeatSheet) {
  const db = getDb();
  if (!db) {
    memoryStore.setBeats(projectId, beatSheet);
    return;
  }

  await db
    .update(schema.projects)
    .set({
      title: beatSheet.title,
      slug: generateSlug(beatSheet.title),
      status: "beats",
      updatedAt: new Date(),
    })
    .where(eq(schema.projects.id, projectId));

  await db.delete(schema.beats).where(eq(schema.beats.projectId, projectId));

  if (beatSheet.beats.length > 0) {
    await db.insert(schema.beats).values(
      beatSheet.beats.map((beat, index) => ({
        projectId,
        orderIndex: index,
        title: beat.title,
        description: beat.description,
        visualPrompt: beat.visualPrompt,
      })),
    );
  }
}

export async function updateBeat(
  projectId: string,
  beatId: string,
  patch: { title?: string; description?: string; visualPrompt?: string },
) {
  const db = getDb();
  if (!db) {
    memoryStore.updateBeat(projectId, beatId, patch);
    return;
  }

  await db
    .update(schema.beats)
    .set(patch)
    .where(eq(schema.beats.id, beatId));
}

export async function initPanelGeneration(projectId: string) {
  const project = await getProjectById(projectId);
  if (!project) throw new Error("Project not found");

  const db = getDb();
  if (!db) {
    memoryStore.initPanels(projectId);
    return getProjectById(projectId);
  }

  await db
    .update(schema.projects)
    .set({ status: "generating", updatedAt: new Date() })
    .where(eq(schema.projects.id, projectId));

  await db.delete(schema.panels).where(eq(schema.panels.projectId, projectId));

  if (project.beats.length > 0) {
    await db.insert(schema.panels).values(
      project.beats.map((beat, index) => ({
        projectId,
        beatId: beat.id,
        orderIndex: index,
        status: "pending" as const,
      })),
    );
  }

  return getProjectById(projectId);
}

export async function saveImageProvider(
  projectId: string,
  imageProvider: ImageProvider,
) {
  const db = getDb();
  if (!db) {
    memoryStore.updateProject(projectId, { imageProvider });
    return;
  }

  await db
    .update(schema.projects)
    .set({ imageProvider, updatedAt: new Date() })
    .where(eq(schema.projects.id, projectId));
}

export async function updatePanel(
  projectId: string,
  panelId: string,
  patch: {
    status?: "pending" | "generating" | "done" | "failed";
    imageUrl?: string | null;
    imageHistory?: string[];
    errorMessage?: string | null;
  },
) {
  const db = getDb();
  if (!db) {
    memoryStore.updatePanel(projectId, panelId, patch);
    return;
  }

  await db
    .update(schema.panels)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(schema.panels.id, panelId));
}

export async function markProjectReady(projectId: string) {
  const db = getDb();
  if (!db) {
    memoryStore.markProjectReady(projectId);
    return;
  }

  await db
    .update(schema.projects)
    .set({ status: "ready", updatedAt: new Date() })
    .where(eq(schema.projects.id, projectId));
}

export async function assertProjectAccess(
  projectId: string,
  sessionId: string,
): Promise<ProjectWithRelations | null> {
  const project = await getProjectById(projectId);
  if (!project || project.sessionId !== sessionId) return null;
  return project;
}
