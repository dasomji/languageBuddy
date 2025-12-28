ALTER TABLE "diary_entries" ADD COLUMN "processing_status" text;--> statement-breakpoint
ALTER TABLE "diary_entries" ADD COLUMN "processing_progress" integer DEFAULT 0 NOT NULL;