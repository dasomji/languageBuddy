ALTER TABLE "mini_story_pages" RENAME COLUMN "text" TO "text_target";--> statement-breakpoint
ALTER TABLE "mini_stories" ADD COLUMN "full_text_target" text NOT NULL;--> statement-breakpoint
ALTER TABLE "mini_stories" ADD COLUMN "full_text_native" text NOT NULL;--> statement-breakpoint
ALTER TABLE "mini_stories" ADD COLUMN "cover_image_key" text;--> statement-breakpoint
ALTER TABLE "mini_stories" ADD COLUMN "language_level" text NOT NULL;--> statement-breakpoint
ALTER TABLE "mini_stories" ADD COLUMN "original_diary_text" text;--> statement-breakpoint
ALTER TABLE "mini_stories" ADD COLUMN "full_translation" text;--> statement-breakpoint
ALTER TABLE "mini_story_pages" ADD COLUMN "text_native" text NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "image_style" text DEFAULT 'children book watercolors' NOT NULL;--> statement-breakpoint
ALTER TABLE "vocabularies" ADD COLUMN "lemma" text NOT NULL;