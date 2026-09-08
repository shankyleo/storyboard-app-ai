import { notFound, redirect } from "next/navigation";
import { InterviewWizard } from "@/components/interview-wizard";
import { getProjectById } from "@/lib/projects";
import { getSessionId } from "@/lib/session";

export default async function InterviewPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const sessionId = await getSessionId();
  const project = await getProjectById(projectId);

  if (!sessionId || !project || project.sessionId !== sessionId) notFound();
  if (project.status !== "interview" && project.beats.length > 0) {
    redirect(`/project/${projectId}/beats`);
  }

  return (
    <InterviewWizard
      projectId={projectId}
      initialAnswers={project.interviewAnswers ?? {}}
    />
  );
}
