import type {
  InterruptStudioChatResponse,
  ListStudioChatMessagesResponse,
  StudioChatStreamEvent,
} from "server";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, apiBaseUrl } from "./client";
import { projectKeys } from "./keys";

export const useListMessages = (projectId: string) =>
  useQuery({
    queryKey: projectKeys.messages(projectId),
    queryFn: async () =>
      (
        await api.get<ListStudioChatMessagesResponse>(
          `/api/projects/${projectId}/messages`,
        )
      ).data,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

type SendChatPayload = {
  projectId: string;
  message: string;
  onEvent?: (event: StudioChatStreamEvent) => void;
};

export const useSendChatMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, message, onEvent }: SendChatPayload) => {
      const response = await fetch(
        `${apiBaseUrl}/api/projects/${projectId}/chat`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message }),
        },
      );

      if (!response.ok || !response.body) {
        const error = (await response.json().catch(() => null)) as {
          error?: string;
          message?: string;
        } | null;
        toast.error(error?.error ?? "Something went wrong", {
          description: error?.message,
        });
        throw new Error(error?.message ?? "Chat request failed");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalText = "";
      let interrupted = false;

      const readLine = (line: string) => {
        const event = JSON.parse(line) as StudioChatStreamEvent;
        onEvent?.(event);

        if (event.type === "assistant") {
          finalText = event.text;
        } else if (event.type === "interrupted") {
          interrupted = true;
        } else if (event.type === "error") {
          toast.error("Agent error", { description: event.message });
          throw new Error(event.message);
        }
      };

      for (;;) {
        const { done, value } = await reader.read();
        buffer += value
          ? decoder.decode(value, { stream: !done })
          : decoder.decode();

        let newlineIndex = buffer.indexOf("\n");
        while (newlineIndex >= 0) {
          const line = buffer.slice(0, newlineIndex).trim();
          buffer = buffer.slice(newlineIndex + 1);
          if (line) readLine(line);
          newlineIndex = buffer.indexOf("\n");
        }

        if (done) break;
      }

      const lastLine = buffer.trim();
      if (lastLine) readLine(lastLine);

      if (!finalText && !interrupted) {
        throw new Error("The agent returned an empty response");
      }

      return { content: finalText, interrupted };
    },
    onSettled: (_data, _error, { projectId }) => {
      void queryClient.invalidateQueries({
        queryKey: projectKeys.messages(projectId),
      });
    },
  });
};

export const useInterruptChat = () =>
  useMutation({
    mutationFn: async ({ projectId }: { projectId: string }) =>
      (
        await api.post<InterruptStudioChatResponse>(
          `/api/projects/${projectId}/chat/interrupt`,
        )
      ).data,
  });
