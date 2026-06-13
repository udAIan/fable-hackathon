import type { Request, Response } from "express";
import { Sandbox } from "e2b";
import { db, studioProjects, studioProjectSessions } from "../../db/client";
import { env } from "../../env";
import { STUDIO_SANDBOX_TIMEOUT_MS, STUDIO_TEMPLATE } from "../../constants";
import type {
  CreateStudioProjectRequest,
  CreateStudioProjectResponse,
  ErrorResponse,
} from "../../types";
import { serializeProject } from "./shared";

export const createStudioProject = async (
  req: Request<object, CreateStudioProjectResponse | ErrorResponse, CreateStudioProjectRequest>,
  res: Response<CreateStudioProjectResponse | ErrorResponse>,
) => {
  const projectName = req.body.projectName?.trim();

  if (!projectName) {
    return res.status(400).json({
      error: "Bad Request",
      message: "projectName is required",
    });
  }

  const sandbox = await Sandbox.create(STUDIO_TEMPLATE, {
    apiKey: env.E2B_API_KEY,
    timeoutMs: STUDIO_SANDBOX_TIMEOUT_MS,
    secure: true,
    lifecycle: {
      onTimeout: "pause",
      autoResume: true,
    },
    metadata: {
      purpose: "studio-project",
    },
  });

  let shouldKillSandbox = true;

  try {
    const project = await db.transaction(async tx => {
      const [created] = await tx
        .insert(studioProjects)
        .values({ projectName, e2bSandboxId: sandbox.sandboxId })
        .returning();

      if (!created) throw new Error("Failed to create studio project");

      await tx
        .insert(studioProjectSessions)
        .values({ projectId: created.projectId });

      return created;
    });

    shouldKillSandbox = false;
    return res.status(201).json(serializeProject(project));
  } finally {
    if (shouldKillSandbox) {
      await sandbox.kill().catch(() => undefined);
    }
  }
};
