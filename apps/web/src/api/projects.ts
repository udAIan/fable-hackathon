import type {
  CreateStudioProjectRequest,
  CreateStudioProjectResponse,
  GetStudioProjectResponse,
  ListStudioProjectsResponse,
} from "server";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "./client";
import { projectKeys } from "./keys";

export const useListProjects = () =>
  useQuery({
    queryKey: projectKeys.list(),
    queryFn: async () =>
      (await api.get<ListStudioProjectsResponse>("/api/projects")).data,
  });

export const useGetProject = (projectId: string) =>
  useQuery({
    queryKey: projectKeys.detail(projectId),
    queryFn: async () =>
      (await api.get<GetStudioProjectResponse>(`/api/projects/${projectId}`))
        .data,
  });

export const useCreateProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: CreateStudioProjectRequest) =>
      (await api.post<CreateStudioProjectResponse>("/api/projects", body)).data,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.all });
      toast.success("Project created");
    },
  });
};
