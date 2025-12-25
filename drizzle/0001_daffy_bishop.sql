CREATE TABLE "diary_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"raw_text" text NOT NULL,
	"target_language" text NOT NULL,
	"level" text NOT NULL,
	"processed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "learning_spaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"target_language" text NOT NULL,
	"native_language" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mini_stories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"diary_entry_id" uuid,
	"title" text NOT NULL,
	"read_count" integer DEFAULT 0 NOT NULL,
	"open_count" integer DEFAULT 0 NOT NULL,
	"last_opened_at" timestamp,
	"current_page" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mini_story_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mini_story_id" uuid NOT NULL,
	"page_number" integer NOT NULL,
	"text" text NOT NULL,
	"image_key" text,
	"audio_key" text
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"user_id" text PRIMARY KEY NOT NULL,
	"audio_playback_delay" integer DEFAULT 1000 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_vocab_progress" (
	"user_id" text NOT NULL,
	"vocab_id" uuid NOT NULL,
	"xp" integer DEFAULT 0 NOT NULL,
	"srs_level" integer DEFAULT 0 NOT NULL,
	"next_review_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_vocab_progress_user_id_vocab_id_pk" PRIMARY KEY("user_id","vocab_id")
);
--> statement-breakpoint
CREATE TABLE "vocabularies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"word" text NOT NULL,
	"translation" text NOT NULL,
	"definition" text,
	"word_kind" text NOT NULL,
	"sex" text,
	"example_sentence" text,
	"example_audio_key" text,
	"image_key" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "diary_entries" ADD CONSTRAINT "diary_entries_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_spaces" ADD CONSTRAINT "learning_spaces_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mini_stories" ADD CONSTRAINT "mini_stories_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mini_stories" ADD CONSTRAINT "mini_stories_diary_entry_id_diary_entries_id_fk" FOREIGN KEY ("diary_entry_id") REFERENCES "public"."diary_entries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mini_story_pages" ADD CONSTRAINT "mini_story_pages_mini_story_id_mini_stories_id_fk" FOREIGN KEY ("mini_story_id") REFERENCES "public"."mini_stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_vocab_progress" ADD CONSTRAINT "user_vocab_progress_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_vocab_progress" ADD CONSTRAINT "user_vocab_progress_vocab_id_vocabularies_id_fk" FOREIGN KEY ("vocab_id") REFERENCES "public"."vocabularies"("id") ON DELETE cascade ON UPDATE no action;