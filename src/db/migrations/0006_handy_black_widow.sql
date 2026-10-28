-- Milestone 10 (Performance). Indexes only — no column or data changes, safe on databases with existing
-- rows. Plain CREATE INDEX (not CONCURRENTLY) because drizzle-kit migrate runs each migration in a
-- transaction; it briefly blocks writes to each table while that index builds, which is negligible at
-- CourseForge's table sizes.
CREATE INDEX "course_module_course_id_idx" ON "course_module" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "course_syllabus_id_idx" ON "course" USING btree ("syllabus_id");--> statement-breakpoint
CREATE INDEX "course_subject_id_idx" ON "course" USING btree ("subject_id");--> statement-breakpoint
CREATE INDEX "module_progress_user_id_idx" ON "module_progress" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "quiz_question_quiz_id_idx" ON "quiz_question" USING btree ("quiz_id");--> statement-breakpoint
CREATE INDEX "subject_syllabus_id_idx" ON "subject" USING btree ("syllabus_id");--> statement-breakpoint
CREATE INDEX "syllabus_user_id_idx" ON "syllabus" USING btree ("user_id");