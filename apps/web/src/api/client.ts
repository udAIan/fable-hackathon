import axios, { isAxiosError } from "axios";
import { QueryClient, QueryCache, MutationCache } from "@tanstack/react-query";
import { toast } from "sonner";

// Public API — no auth. Points at the deployed server origin via VITE_API_URL.
export const apiBaseUrl = import.meta.env.VITE_API_URL ?? "";

export const api = axios.create({ baseURL: apiBaseUrl });

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
  // Every failed query/mutation surfaces as an error toast, so API problems are
  // always visible. A mutation that renders its own error UI can opt out with
  // meta: { skipGlobalErrorToast: true }.
  queryCache: new QueryCache({
    onError: showApiErrorToast,
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      if (mutation.meta?.skipGlobalErrorToast) return;
      showApiErrorToast(error);
    },
  }),
});

// Hoisted so it can be referenced in the queryClient config above while the
// exports stay at the top. Pulls the server's { error, message } off the
// Axios error for the toast.
function showApiErrorToast(error: unknown) {
  if (isAxiosError(error)) {
    const data = error.response?.data as
      | { error?: string; message?: string }
      | undefined;
    toast.error(data?.error ?? "Request failed", {
      description: data?.message ?? error.message,
    });
    return;
  }
  toast.error("Request failed", {
    description: error instanceof Error ? error.message : undefined,
  });
}
