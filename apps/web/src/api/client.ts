import axios from "axios";
import { QueryClient } from "@tanstack/react-query";

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
});
