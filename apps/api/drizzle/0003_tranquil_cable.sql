CREATE TYPE "public"."flow_status" AS ENUM('draft_local', 'published', 'archived');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "flows" (
	"id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"created_by" text NOT NULL,
	"title" text NOT NULL,
	"status" "flow_status" DEFAULT 'draft_local' NOT NULL,
	"current_version_id" uuid,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "flows" ADD CONSTRAINT "flows_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "flows" ADD CONSTRAINT "flows_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "flows_workspace_id_idx" ON "flows" USING btree ("workspace_id");