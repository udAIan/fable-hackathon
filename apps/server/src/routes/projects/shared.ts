import type { StudioProject } from "../../types";

type StudioProjectRow = {
  projectId: string;
  projectName: string;
  e2bSandboxId: string;
  createdAt: Date;
};

export const serializeProject = (row: StudioProjectRow): StudioProject => ({
  projectId: row.projectId,
  projectName: row.projectName,
  e2bSandboxId: row.e2bSandboxId,
  createdAt: row.createdAt.toISOString(),
});
