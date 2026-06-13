import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db, studioProjects } from "../../db/client";
import type { ErrorResponse, GetStudioProjectResponse } from "../../types";
import { serializeProject } from "./shared";

export const getStudioProject = async (
  req: Request<{ projectId: string }>,
  res: Response<GetStudioProjectResponse | ErrorResponse>,
) => {
  const { projectId } = req.params;

  const [row] = await db
    .select({
      projectId: studioProjects.projectId,
      projectName: studioProjects.projectName,
      e2bSandboxId: studioProjects.e2bSandboxId,
      createdAt: studioProjects.createdAt,
    })
    .from(studioProjects)
    .where(eq(studioProjects.projectId, projectId))
    .limit(1);

  if (!row) {
    return res.status(404).json({
      error: "Not Found",
      message: "Studio project not found",
    });
  }

  return res.json(serializeProject(row));
};
