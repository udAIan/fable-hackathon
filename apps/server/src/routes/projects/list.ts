import type { Request, Response } from "express";
import { desc } from "drizzle-orm";
import { db, studioProjects } from "../../db/client";
import type { ListStudioProjectsResponse } from "../../types";
import { serializeProject } from "./shared";

export const listStudioProjects = async (
  _req: Request,
  res: Response<ListStudioProjectsResponse>,
) => {
  const rows = await db
    .select({
      projectId: studioProjects.projectId,
      projectName: studioProjects.projectName,
      e2bSandboxId: studioProjects.e2bSandboxId,
      createdAt: studioProjects.createdAt,
    })
    .from(studioProjects)
    .orderBy(desc(studioProjects.createdAt));

  return res.json(rows.map(serializeProject));
};
