-- Milestone 9 (Course Sharing). Reviewed for databases with existing rows: no hand-edit needed —
-- `visibility` is NOT NULL but has a constant default (Postgres fills existing rows), every other new
-- course column is nullable, the share_token UNIQUE constraint is satisfied by all-NULL values, and
-- course_permission is a new, empty table.
CREATE TYPE "public"."course_permission_role" AS ENUM('viewer');--> statement-breakpoint
CREATE TYPE "public"."course_visibility" AS ENUM('private', 'link');--> statement-breakpoint
CREATE TABLE "course_permission" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"email" text NOT NULL,
	"role" "course_permission_role" DEFAULT 'viewer' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "course_permission_course_id_email_unique" UNIQUE("course_id","email")
);
--> statement-breakpoint
ALTER TABLE "course" ADD COLUMN "visibility" "course_visibility" DEFAULT 'private' NOT NULL;--> statement-breakpoint
ALTER TABLE "course" ADD COLUMN "share_token" text;--> statement-breakpoint
ALTER TABLE "course" ADD COLUMN "source_course_id" uuid;--> statement-breakpoint
ALTER TABLE "course" ADD COLUMN "original_creator_name" text;--> statement-breakpoint
ALTER TABLE "course" ADD COLUMN "copied_at" timestamp;--> statement-breakpoint
ALTER TABLE "course_permission" ADD CONSTRAINT "course_permission_course_id_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."course"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "course_permission_email_idx" ON "course_permission" USING btree ("email");--> statement-breakpoint
ALTER TABLE "course" ADD CONSTRAINT "course_source_course_id_course_id_fk" FOREIGN KEY ("source_course_id") REFERENCES "public"."course"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "course_source_course_id_idx" ON "course" USING btree ("source_course_id");--> statement-breakpoint
ALTER TABLE "course" ADD CONSTRAINT "course_share_token_unique" UNIQUE("share_token");