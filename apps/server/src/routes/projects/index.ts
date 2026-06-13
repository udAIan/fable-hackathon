import { Router } from "express";
import { createStudioProject } from "./create";
import { getStudioProject } from "./get";
import { listStudioProjects } from "./list";
import { listStudioProjectMessages } from "./messages";
import { getStudioProjectPreview } from "./preview";
import { interruptStudioProjectChat, studioProjectChat } from "./chat";

export const projectsRouter: Router = Router();

projectsRouter.get("/", listStudioProjects);
projectsRouter.post("/", createStudioProject);
projectsRouter.get("/:projectId", getStudioProject);
projectsRouter.get("/:projectId/messages", listStudioProjectMessages);
projectsRouter.get("/:projectId/preview", getStudioProjectPreview);
projectsRouter.post("/:projectId/chat", studioProjectChat);
projectsRouter.post("/:projectId/chat/interrupt", interruptStudioProjectChat);
