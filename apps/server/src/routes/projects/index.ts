import { Router } from "express";
import { createStudioProject } from "./create";
import { getStudioProject } from "./get";
import { listStudioProjects } from "./list";
import { listStudioProjectMessages } from "./messages";
import { interruptStudioProjectChat, studioProjectChat } from "./chat";

export const projectsRouter: Router = Router();

projectsRouter.get("/", listStudioProjects);
projectsRouter.post("/", createStudioProject);
projectsRouter.get("/:projectId", getStudioProject);
projectsRouter.get("/:projectId/messages", listStudioProjectMessages);
projectsRouter.post("/:projectId/chat", studioProjectChat);
projectsRouter.post("/:projectId/chat/interrupt", interruptStudioProjectChat);
