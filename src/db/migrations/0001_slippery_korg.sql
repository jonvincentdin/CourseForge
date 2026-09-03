CREATE TYPE "public"."course_source" AS ENUM('imported', 'generated', 'shared_copy');--> statement-breakpoint
CREATE TYPE "public"."quiz_question_type" AS ENUM('multiple_choice', 'multiple_select', 'true_false', 'identification');--> statement-breakpoint
CREATE TABLE "course_module" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"learning_objectives" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"content_markdown" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "course" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"subject_id" uuid,
	"syllabus_id" uuid,
	"title" text NOT NULL,
	"subject_code" text,
	"academic_year" integer,
	"semester" "semester",
	"description" text,
	"learning_objectives" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"schema_version" text DEFAULT '1.0' NOT NULL,
	"source" "course_source" DEFAULT 'imported' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quiz_question" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quiz_id" uuid NOT NULL,
	"type" "quiz_question_type" NOT NULL,
	"prompt" text NOT NULL,
	"options" jsonb,
	"correct_answer" jsonb NOT NULL,
	"explanation" text,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quiz" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"module_id" uuid NOT NULL,
	"title" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "quiz_module_id_unique" UNIQUE("module_id")
);
--> statement-breakpoint
ALTER TABLE "course_module" ADD CONSTRAINT "course_module_course_id_course_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."course"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course" ADD CONSTRAINT "course_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course" ADD CONSTRAINT "course_subject_id_subject_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subject"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course" ADD CONSTRAINT "course_syllabus_id_syllabus_id_fk" FOREIGN KEY ("syllabus_id") REFERENCES "public"."syllabus"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_question" ADD CONSTRAINT "quiz_question_quiz_id_quiz_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."quiz"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz" ADD CONSTRAINT "quiz_module_id_course_module_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."course_module"("id") ON DELETE cascade ON UPDATE no action;