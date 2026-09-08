import { notFound } from "next/navigation";
import { BeatEditor } from "@/components/beat-editor";
import { getProjectById } from "@/lib/projects";
import { getSessionId } from "@/lib/session";

export default async function BeatsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const sessionId = await getSessionId();
  const project = await getProjectById(projectId);

  if (!sessionId || !project || project.sessionId !== sessionId) notFound();
  if (project.beats.length === 0) notFound();

  const beats = [...project.beats].sort((a, b) => a.orderIndex - b.orderIndex);

  return (
    <BeatEditor projectId={projectId} title={project.title} beats={beats} />
  );
}
