import { desc, eq } from "drizzle-orm";
import { db, studioProjects, studioProjectSessions } from "../../db/client";

// Resolves the project's sandbox plus its most-recent session row. The session
// carries the Claude Code session id used to `--resume` and to locate the
// transcript when rebuilding chat history from the sandbox.
export const getActiveStudioProjectSession = async (projectId: string) => {
  const [project] = await db
    .select({ e2bSandboxId: studioProjects.e2bSandboxId })
    .from(studioProjects)
    .where(eq(studioProjects.projectId, projectId))
    .limit(1);

  if (!project) return null;

  const [session] = await db
    .select({
      sessionId: studioProjectSessions.sessionId,
      claudeSessionId: studioProjectSessions.claudeSessionId,
    })
    .from(studioProjectSessions)
    .where(eq(studioProjectSessions.projectId, projectId))
    .orderBy(
      desc(studioProjectSessions.createdAt),
      desc(studioProjectSessions.sessionId),
    )
    .limit(1);

  if (!session) throw new Error("Studio project session not found");

  return {
    e2bSandboxId: project.e2bSandboxId,
    sessionId: session.sessionId,
    claudeSessionId: session.claudeSessionId,
  };
};
