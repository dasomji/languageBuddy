ALTER TABLE "user_settings" ADD COLUMN "shortcut_audio_forward" text DEFAULT 'a' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "shortcut_audio_back" text DEFAULT 'd' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "shortcut_audio_play_pause" text DEFAULT ' ' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "shortcut_audio_stop" text DEFAULT 's' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "shortcut_story_next" text DEFAULT 'ArrowRight' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "shortcut_story_prev" text DEFAULT 'ArrowLeft' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "shortcut_vodex_next" text DEFAULT 'ArrowDown' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "shortcut_vodex_prev" text DEFAULT 'ArrowUp' NOT NULL;