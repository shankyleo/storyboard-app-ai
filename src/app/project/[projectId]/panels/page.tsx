import { notFound, redirect } from "next/navigation";
import { PanelProgress } from "@/components/panel-progress";
import {
  getDefaultImageProvider,
  getAvailableImageProviders,
} from "@/lib/image-providers";
import { getProjectById, initPanelGeneration } from "@/lib/projects";
import { getSessionId } from "@/lib/session";

export default async function PanelsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const sessionId = await getSessionId();
  let project = await getProjectById(projectId);

  if (!sessionId || !project || project.sessionId !== sessionId) notFound();
  if (project.beats.length === 0) redirect(`/project/${projectId}/beats`);

  if (project.panels.length === 0) {
    project = (await initPanelGeneration(projectId)) ?? project;
  }

  const panels = [...project.panels].sort((a, b) => a.orderIndex - b.orderIndex);
  const beats = [...project.beats]
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((b) => ({ title: b.title, description: b.description }));

  return (
    <PanelProgress
      projectId={projectId}
      slug={project.slug}
      initialPanels={panels}
      initialStatus={project.status}
      beats={beats}
      availableProviders={getAvailableImageProviders()}
      defaultProvider={getDefaultImageProvider()}
      savedImageProvider={project.imageProvider}
    />
  );
}
