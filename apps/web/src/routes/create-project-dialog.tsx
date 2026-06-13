import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useCreateProject } from "../api/projects";

export const CreateProjectDialog = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const navigate = useNavigate();
  const [projectName, setProjectName] = useState("");
  const createProject = useCreateProject();

  const submit = () => {
    const name = projectName.trim();
    if (!name || createProject.isPending) return;

    createProject.mutate(
      { projectName: name },
      {
        onSuccess: project => {
          setProjectName("");
          onOpenChange(false);
          navigate({
            to: "/projects/$projectId",
            params: { projectId: project.projectId },
          });
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Studio Project</DialogTitle>
        </DialogHeader>
        <div className="grid gap-2 py-2">
          <Label htmlFor="project-name">Project Name</Label>
          <Input
            id="project-name"
            value={projectName}
            placeholder="Dashboard prototype"
            autoFocus
            onChange={event => setProjectName(event.target.value)}
            onKeyDown={event => {
              if (event.key === "Enter") submit();
            }}
          />
          <p className="text-xs text-muted-foreground">
            Creating a project spins up a fresh sandbox — this can take a few
            seconds.
          </p>
        </div>
        <DialogFooter>
          <Button
            onClick={submit}
            disabled={!projectName.trim() || createProject.isPending}
          >
            {createProject.isPending ? "Creating…" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
