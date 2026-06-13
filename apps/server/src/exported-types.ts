// Type barrel consumed by the web app via `import type { … } from "server"`.
// These are type-only re-exports, so the web bundle never pulls server runtime code.
export type {
  ErrorResponse,
  StudioProjectListItem,
  StudioProject,
  ListStudioProjectsResponse,
  CreateStudioProjectRequest,
  CreateStudioProjectResponse,
  GetStudioProjectResponse,
  GetStudioProjectPreviewResponse,
  UploadedStudioInput,
  UploadStudioInputsResponse,
  StudioChatRole,
  StudioChatMessage,
  ListStudioChatMessagesResponse,
  StudioChatRequest,
  StudioChatStepStatus,
  StudioChatStreamEvent,
  InterruptStudioChatResponse,
} from "./types";
