import fs from "node:fs";
import path from "node:path";
import { nanoid } from "nanoid";
import type { BeatSheet } from "@/lib/beats";
import type { Beat, Panel, Project } from "@/db/schema";
import { generateSlug } from "@/lib/session";

type MemoryProject = Project & {
  beats: Beat[];
  panels: Panel[];
};

const DATA_PATH = path.join(process.cwd(), ".data", "memory-store.json");

function revive(project: MemoryProject): MemoryProject {
  return {
    ...project,
    createdAt: new Date(project.createdAt),
    updatedAt: new Date(project.updatedAt),
    beats: (project.beats ?? []).map((beat) => ({
      ...beat,
      createdAt: new Date(beat.createdAt),
    })),
    panels: (project.panels ?? []).map((panel) => ({
      ...panel,
      createdAt: new Date(panel.createdAt),
      updatedAt: new Date(panel.updatedAt),
    })),
  };
}

function loadStore(): Map<string, MemoryProject> {
  try {
    const raw = fs.readFileSync(DATA_PATH, "utf8");
    const parsed = JSON.parse(raw) as MemoryProject[];
    return new Map(parsed.map((project) => [project.id, revive(project)]));
  } catch {
    return new Map();
  }
}

function persist() {
  fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
  const fromDisk = loadStore();
  for (const [id, project] of store) {
    fromDisk.set(id, project);
  }
  store = fromDisk;
  fs.writeFileSync(DATA_PATH, JSON.stringify([...fromDisk.values()]));
}

let store = loadStore();

function hydrate(id?: string) {
  const fromDisk = loadStore();
  if (!id) {
    store = fromDisk;
    return;
  }
  const found = fromDisk.get(id);
  if (found) store.set(id, found);
}

function memoryProject(
  sessionId: string,
  title = "Untitled Story",
): MemoryProject {
  const now = new Date();
  return {
    id: nanoid(),
    sessionId,
    title,
    slug: generateSlug(title),
    status: "interview",
    imageProvider: null,
    interviewAnswers: {},
    createdAt: now,
    updatedAt: now,
    beats: [],
    panels: [],
  };
}

export const memoryStore = {
  createProject(sessionId: string, title?: string) {
    const project = memoryProject(sessionId, title);
    store.set(project.id, project);
    persist();
    return project;
  },

  getProject(id: string) {
    hydrate(id);
    return store.get(id) ?? null;
  },

  getProjectBySlug(slug: string) {
    hydrate();
    for (const project of store.values()) {
      if (project.slug === slug) return project;
    }
    return null;
  },

  listProjectsForSession(sessionId: string) {
    hydrate();
    return [...store.values()]
      .filter((p) => p.sessionId === sessionId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  },

  updateProject(
    id: string,
    patch: Partial<
      Pick<Project, "title" | "status" | "interviewAnswers" | "slug" | "imageProvider">
    >,
  ) {
    hydrate(id);
    const project = store.get(id);
    if (!project) return null;
    Object.assign(project, patch, { updatedAt: new Date() });
    persist();
    return project;
  },

  setBeats(projectId: string, beatSheet: BeatSheet) {
    hydrate(projectId);
    const project = store.get(projectId);
    if (!project) return null;

    project.title = beatSheet.title;
    project.beats = beatSheet.beats.map((beat, index) => ({
      id: nanoid(),
      projectId,
      orderIndex: index,
      title: beat.title,
      description: beat.description,
      visualPrompt: beat.visualPrompt,
      createdAt: new Date(),
    }));
    project.panels = [];
    project.status = "beats";
    project.updatedAt = new Date();
    persist();
    return project;
  },

  updateBeat(
    projectId: string,
    beatId: string,
    patch: Partial<Pick<Beat, "title" | "description" | "visualPrompt">>,
  ) {
    hydrate(projectId);
    const project = store.get(projectId);
    if (!project) return null;
    const beat = project.beats.find((b) => b.id === beatId);
    if (!beat) return null;
    Object.assign(beat, patch);
    project.updatedAt = new Date();
    persist();
    return beat;
  },

  initPanels(projectId: string) {
    hydrate(projectId);
    const project = store.get(projectId);
    if (!project) return null;

    project.panels = project.beats.map((beat, index) => ({
      id: nanoid(),
      projectId,
      beatId: beat.id,
      orderIndex: index,
      status: "pending" as const,
      imageUrl: null,
      errorMessage: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    project.status = "generating";
    project.updatedAt = new Date();
    persist();
    return project.panels;
  },

  updatePanel(
    projectId: string,
    panelId: string,
    patch: Partial<Pick<Panel, "status" | "imageUrl" | "errorMessage">>,
  ) {
    hydrate(projectId);
    const project = store.get(projectId);
    if (!project) return null;
    const panel = project.panels.find((p) => p.id === panelId);
    if (!panel) return null;
    Object.assign(panel, patch, { updatedAt: new Date() });
    persist();
    return panel;
  },

  markProjectReady(projectId: string) {
    hydrate(projectId);
    const project = store.get(projectId);
    if (!project) return null;
    project.status = "ready";
    project.updatedAt = new Date();
    persist();
    return project;
  },
};
