ALTER TABLE "vodex_packages" ADD COLUMN "total_words" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "vodex_packages" ADD COLUMN "processed_words" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "vodex_packages" ADD COLUMN "status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "vodex_packages" ADD COLUMN "processing_error" text;