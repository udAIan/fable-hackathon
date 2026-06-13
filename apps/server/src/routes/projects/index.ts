import { Router } from "express";
import { createStudioProject } from "./create";
import { getStudioProject } from "./get";
import { listStudioProjects } from "./list";
import { listStudioProjectMessages } from "./messages";
import { getStudioProjectPreview } from "./preview";
import { uploadInputsMiddleware, uploadStudioInputs } from "./upload";
import { lipsyncStatus, startLipsync } from "./lipsync";
import { interruptStudioProjectChat, studioProjectChat } from "./chat";

export const projectsRouter: Router = Router();

projectsRouter.get("/", listStudioProjects);
projectsRouter.post("/", createStudioProject);
projectsRouter.get("/:projectId", getStudioProject);
projectsRouter.get("/:projectId/messages", listStudioProjectMessages);
projectsRouter.get("/:projectId/preview", getStudioProjectPreview);
projectsRouter.post(
  "/:projectId/upload",
  uploadInputsMiddleware,
  uploadStudioInputs,
);
projectsRouter.post("/:projectId/lipsync", startLipsync);
projectsRouter.get("/:projectId/lipsync", lipsyncStatus);
projectsRouter.post("/:projectId/chat", studioProjectChat);
projectsRouter.post("/:projectId/chat/interrupt", interruptStudioProjectChat);
