import type { UploadStudioInputsResponse } from "server";
import { useMutation } from "@tanstack/react-query";
import { api } from "./client";

export const useUploadInputs = (projectId: string) =>
  useMutation({
    mutationFn: async (files: File[]) => {
      const form = new FormData();
      for (const file of files) form.append("files", file);
      return (
        await api.post<UploadStudioInputsResponse>(
          `/api/projects/${projectId}/upload`,
          form,
        )
      ).data;
    },
  });
