CREATE TABLE "studio_project_sessions" (
	"session_id" serial NOT NULL,
	"project_id" uuid NOT NULL,
	"claude_session_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "studio_project_sessions_pkey" PRIMARY KEY("session_id"),
	CONSTRAINT "studio_project_sessions_claude_session_id_key" UNIQUE("claude_session_id")
);
--> statement-breakpoint
CREATE TABLE "studio_projects" (
	"project_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"project_name" text NOT NULL,
	"e2b_sandbox_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "studio_projects_pkey" PRIMARY KEY("project_id")
);
--> statement-breakpoint
ALTER TABLE "studio_project_sessions" ADD CONSTRAINT "studio_project_sessions_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."studio_projects"("project_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "studio_project_sessions_project_id_created_at_idx" ON "studio_project_sessions" USING btree ("project_id","created_at");