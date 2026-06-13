import { Loader2, RotateCw } from "lucide-react";
import { Button } from "../components/ui/button";
import { usePreview } from "../api/preview";
import { useWorkspaceStore } from "../store/workspace";

export const PreviewPane = ({ projectId }: { projectId: string }) => {
  const { data, isPending, isError, refetch } = usePreview(projectId);
  const previewRefreshKey = useWorkspaceStore(state => state.previewRefreshKey);
  const refreshPreview = useWorkspaceStore(state => state.refreshPreview);

  if (isPending) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Starting preview…
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
        Preview unavailable.
        <Button variant="outline" size="sm" onClick={() => void refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-9 shrink-0 items-center justify-end border-b border-border px-2">
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          aria-label="Reload preview"
          onClick={async () => {
            await refetch();
            refreshPreview();
          }}
        >
          <RotateCw className="size-3.5" />
        </Button>
      </div>
      <iframe
        key={previewRefreshKey}
        src={data.url}
        title="Preview"
        className="min-h-0 w-full flex-1 border-0 bg-white"
      />
    </div>
  );
};
