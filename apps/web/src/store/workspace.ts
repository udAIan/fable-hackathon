import { create } from "zustand";

// Cross-component workspace UI state. Server data lives in React Query; this
// holds only ephemeral signals shared across the chat and preview panes.
type WorkspaceState = {
  // Bumped to force the preview iframe to reload — after a chat turn (HMR
  // safety net) or a manual reload.
  previewRefreshKey: number;
  refreshPreview: () => void;
};

export const useWorkspaceStore = create<WorkspaceState>(set => ({
  previewRefreshKey: 0,
  refreshPreview: () =>
    set(state => ({ previewRefreshKey: state.previewRefreshKey + 1 })),
}));
