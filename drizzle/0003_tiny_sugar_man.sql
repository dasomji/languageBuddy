ALTER TABLE "diary_entries" ADD COLUMN "learning_space_id" uuid;--> statement-breakpoint
ALTER TABLE "learning_spaces" ADD COLUMN "name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "learning_spaces" ADD COLUMN "level" text NOT NULL;--> statement-breakpoint
ALTER TABLE "learning_spaces" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "mini_stories" ADD COLUMN "learning_space_id" uuid;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "active_learning_space_id" uuid;--> statement-breakpoint
ALTER TABLE "user_vocab_progress" ADD COLUMN "learning_space_id" uuid;--> statement-breakpoint
ALTER TABLE "vocabularies" ADD COLUMN "learning_space_id" uuid;--> statement-breakpoint
ALTER TABLE "user_vocab_progress" DROP CONSTRAINT "user_vocab_progress_user_id_vocab_id_pk";--> statement-breakpoint
ALTER TABLE "user_vocab_progress" ADD CONSTRAINT "user_vocab_progress_user_id_learning_space_id_vocab_id_pk" PRIMARY KEY("user_id","learning_space_id","vocab_id");--> statement-breakpoint
ALTER TABLE "diary_entries" ADD CONSTRAINT "diary_entries_learning_space_id_learning_spaces_id_fk" FOREIGN KEY ("learning_space_id") REFERENCES "public"."learning_spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mini_stories" ADD CONSTRAINT "mini_stories_learning_space_id_learning_spaces_id_fk" FOREIGN KEY ("learning_space_id") REFERENCES "public"."learning_spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_active_learning_space_id_learning_spaces_id_fk" FOREIGN KEY ("active_learning_space_id") REFERENCES "public"."learning_spaces"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_vocab_progress" ADD CONSTRAINT "user_vocab_progress_learning_space_id_learning_spaces_id_fk" FOREIGN KEY ("learning_space_id") REFERENCES "public"."learning_spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vocabularies" ADD CONSTRAINT "vocabularies_learning_space_id_learning_spaces_id_fk" FOREIGN KEY ("learning_space_id") REFERENCES "public"."learning_spaces"("id") ON DELETE cascade ON UPDATE no action;