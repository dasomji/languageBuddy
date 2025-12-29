CREATE TABLE "practice_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"vocab_id" uuid NOT NULL,
	"practice_type" text NOT NULL,
	"rating" integer NOT NULL,
	"user_answer" text,
	"correct_answer" text,
	"response_time_ms" integer NOT NULL,
	"prompt_text" text,
	"xp_gained" integer DEFAULT 0 NOT NULL,
	"stability_before" real,
	"stability_after" real,
	"difficulty_before" real,
	"difficulty_after" real,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "practice_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"learning_space_id" uuid NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"target_count" integer DEFAULT 20 NOT NULL,
	"completed_count" integer DEFAULT 0 NOT NULL,
	"total_xp_gained" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_vocab_progress" ADD COLUMN "difficulty" real DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_vocab_progress" ADD COLUMN "stability" real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_vocab_progress" ADD COLUMN "state" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_vocab_progress" ADD COLUMN "elapsed_days" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_vocab_progress" ADD COLUMN "scheduled_days" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_vocab_progress" ADD COLUMN "reps" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_vocab_progress" ADD COLUMN "lapses" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_vocab_progress" ADD COLUMN "last_review" timestamp;--> statement-breakpoint
ALTER TABLE "user_vocab_progress" ADD COLUMN "due" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "user_vocab_progress" ADD COLUMN "last_practice_type" text;--> statement-breakpoint
ALTER TABLE "user_vocab_progress" ADD COLUMN "unlocked_practice_types" text[] DEFAULT ARRAY['foreign_recognition']::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "practice_results" ADD CONSTRAINT "practice_results_session_id_practice_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."practice_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_results" ADD CONSTRAINT "practice_results_vocab_id_vocabularies_id_fk" FOREIGN KEY ("vocab_id") REFERENCES "public"."vocabularies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_sessions" ADD CONSTRAINT "practice_sessions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_sessions" ADD CONSTRAINT "practice_sessions_learning_space_id_learning_spaces_id_fk" FOREIGN KEY ("learning_space_id") REFERENCES "public"."learning_spaces"("id") ON DELETE cascade ON UPDATE no action;