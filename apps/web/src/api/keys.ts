export const projectKeys = {
  all: ["projects"] as const,
  list: () => [...projectKeys.all, "list"] as const,
  detail: (projectId: string) =>
    [...projectKeys.all, "detail", projectId] as const,
  messages: (projectId: string) =>
    [...projectKeys.all, "detail", projectId, "messages"] as const,
};
