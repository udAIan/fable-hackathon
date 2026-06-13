import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "../components/ui/button";
import { useListProjects } from "../api/projects";
import { CreateProjectDialog } from "./create-project-dialog";

export const ProjectsListPage = () => {
  const { data, isPending } = useListProjects();
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Studio</h1>
        <Button onClick={() => setDialogOpen(true)}>Create Project</Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {isPending ? (
              <tr>
                <td
                  colSpan={2}
                  className="px-4 py-10 text-center text-muted-foreground"
                >
                  Loading…
                </td>
              </tr>
            ) : data && data.length > 0 ? (
              data.map(project => (
                <tr
                  key={project.projectId}
                  className="cursor-pointer border-t border-border hover:bg-muted/40"
                  onClick={() =>
                    navigate({
                      to: "/projects/$projectId",
                      params: { projectId: project.projectId },
                    })
                  }
                >
                  <td className="px-4 py-3 font-medium">
                    {project.projectName}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(project.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={2}
                  className="px-4 py-10 text-center text-muted-foreground"
                >
                  No projects yet. Create one to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <CreateProjectDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
};
