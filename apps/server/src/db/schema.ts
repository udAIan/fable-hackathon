import {
  foreignKey,
  index,
  pgTable,
  serial,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const studioProjects = pgTable("studio_projects", {
  projectId: uuid("project_id").defaultRandom().primaryKey(),
  projectName: text("project_name").notNull(),
  e2bSandboxId: text("e2b_sandbox_id").notNull(),
  // Claude Code session id for the project, captured on the first agent run and
  // passed back via `--resume` on subsequent runs. Null until the first message.
  claudeSessionId: text("claude_session_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const studioProjectMessages = pgTable(
  "studio_project_messages",
  {
    // Serial doubles as the chronological ordering key for a project's thread.
    messageId: serial("message_id").primaryKey(),
    projectId: uuid("project_id").notNull(),
    role: text("role").$type<"user" | "assistant">().notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  table => [
    foreignKey({
      name: "spm_project_id_fkey",
      columns: [table.projectId],
      foreignColumns: [studioProjects.projectId],
    }).onDelete("cascade"),
    index("spm_project_id_message_id_idx").on(
      table.projectId,
      table.messageId,
    ),
  ],
);
