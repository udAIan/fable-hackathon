import { useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, Check, Copy } from "lucide-react";
import { Button } from "../components/ui/button";
import { useGetProject } from "../api/projects";
import { ChatPanel } from "./chat-panel";

export const ProjectDetailPage = () => {
  const { projectId } = useParams({ from: "/projects/$projectId" });
  const { data: project, isError } = useGetProject(projectId);

  if (isError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-sm text-muted-foreground">
        Studio project not found.
        <Button asChild variant="outline">
          <Link to="/">Back to projects</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border px-3">
        <Button asChild variant="ghost" size="icon" className="size-8">
          <Link to="/" aria-label="Back to projects">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <h1 className="truncate text-sm font-medium">
          {project?.projectName ?? "Loading…"}
        </h1>
        {project ? <SandboxBadge sandboxId={project.e2bSandboxId} /> : null}
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="flex min-w-80 basis-1/3 flex-col overflow-hidden border-r border-border">
          {project ? (
            <ChatPanel projectId={projectId} />
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              Loading…
            </div>
          )}
        </div>

        <div className="flex min-h-0 flex-1 items-center justify-center bg-muted/20 p-6">
          <div className="text-center text-sm">
            <p className="font-medium text-foreground">Preview</p>
            <p className="text-muted-foreground">
              Coming soon — the right panel is a placeholder.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const SandboxBadge = ({ sandboxId }: { sandboxId: string }) => {
  const [copied, setCopied] = useState(false);

  return (
    <div className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className="shrink-0">Sandbox</span>
      <span
        className="max-w-64 truncate font-mono text-foreground"
        title={sandboxId}
      >
        {sandboxId}
      </span>
      <button
        type="button"
        aria-label="Copy sandbox id"
        title="Copy"
        className="rounded p-1 transition-colors hover:bg-muted"
        onClick={async () => {
          await navigator.clipboard.writeText(sandboxId);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      </button>
    </div>
  );
};
