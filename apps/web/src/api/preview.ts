import type { GetStudioProjectPreviewResponse } from "server";
import { useQuery } from "@tanstack/react-query";
import { api } from "./client";
import { projectKeys } from "./keys";

// Resolves the sandbox's live preview URL. The server ensures the dev server is
// running before responding, so the first load can take a few seconds.
export const usePreview = (projectId: string) =>
  useQuery({
    queryKey: projectKeys.preview(projectId),
    queryFn: async () =>
      (
        await api.get<GetStudioProjectPreviewResponse>(
          `/api/projects/${projectId}/preview`,
        )
      ).data,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
