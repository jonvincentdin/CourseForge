-- Hand-edited (Milestone 8): drizzle-kit generated `ADD COLUMN "version_group_id" uuid NOT NULL`,
-- which fails on any database that already has course rows. Add it nullable, backfill every
-- existing course as the root (v1) of its own version group, then tighten to NOT NULL.
ALTER TABLE "course" ADD COLUMN "version_group_id" uuid;--> statement-breakpoint
UPDATE "course" SET "version_group_id" = "id" WHERE "version_group_id" IS NULL;--> statement-breakpoint
ALTER TABLE "course" ALTER COLUMN "version_group_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "course" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
CREATE INDEX "course_owner_id_idx" ON "course" USING btree ("owner_id");--> statement-breakpoint
ALTER TABLE "course" ADD CONSTRAINT "course_version_group_id_version_unique" UNIQUE("version_group_id","version");
