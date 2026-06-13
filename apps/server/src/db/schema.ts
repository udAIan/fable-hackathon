import {
  foreignKey,
  index,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const studioProjects = pgTable(
  "studio_projects",
  {
    projectId: uuid("project_id").defaultRandom().notNull(),
    projectName: text("project_name").notNull(),
    e2bSandboxId: text("e2b_sandbox_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  table => [
    primaryKey({
      name: "studio_projects_pkey",
      columns: [table.projectId],
    }),
  ],
);

export const studioProjectSessions = pgTable(
  "studio_project_sessions",
  {
    sessionId: serial("session_id").notNull(),
    projectId: uuid("project_id").notNull(),
    // Claude Code session id: captured from the first run's init event and
    // replayed via `--resume` on later turns. Null until the first agent run.
    // Also locates the transcript when chat history is rebuilt from the sandbox.
    claudeSessionId: text("claude_session_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  table => [
    primaryKey({
      name: "studio_project_sessions_pkey",
      columns: [table.sessionId],
    }),
    foreignKey({
      name: "studio_project_sessions_project_id_fk",
      columns: [table.projectId],
      foreignColumns: [studioProjects.projectId],
    }),
    unique("studio_project_sessions_claude_session_id_key").on(
      table.claudeSessionId,
    ),
    index("studio_project_sessions_project_id_created_at_idx").on(
      table.projectId,
      table.createdAt,
    ),
  ],
);
