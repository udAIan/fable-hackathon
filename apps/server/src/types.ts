export type ErrorResponse = {
  error: string;
  message: string;
};

export type StudioProjectListItem = {
  projectId: string;
  projectName: string;
  e2bSandboxId: string;
  createdAt: string;
};

export type StudioProject = StudioProjectListItem;

export type ListStudioProjectsResponse = StudioProjectListItem[];

export type CreateStudioProjectRequest = {
  projectName: string;
};

export type CreateStudioProjectResponse = StudioProject;

export type GetStudioProjectResponse = StudioProject;

export type GetStudioProjectPreviewResponse = {
  url: string;
};

export type UploadedStudioInput = {
  name: string;
  path: string;
  url: string;
};

export type UploadStudioInputsResponse = {
  files: UploadedStudioInput[];
};

export type StudioChatRole = "user" | "assistant";

export type StudioChatMessage = {
  id: string;
  role: StudioChatRole;
  content: string;
  createdAt: string;
};

export type ListStudioChatMessagesResponse = StudioChatMessage[];

export type StudioChatRequest = {
  message: string;
};

export type StudioChatStepStatus = "running" | "completed" | "failed";

// Normalized agent stream protocol (NDJSON, one JSON object per line).
export type StudioChatStreamEvent =
  | { type: "session"; sessionId: string }
  | {
      type: "step";
      id: string;
      label: string;
      detail?: string;
      status: StudioChatStepStatus;
    }
  | { type: "assistant"; text: string }
  | { type: "error"; message: string }
  | { type: "interrupted" };

export type InterruptStudioChatResponse = {
  interrupted: boolean;
};
