CREATE TABLE "vocab_to_package" (
	"vocab_id" uuid NOT NULL,
	"package_id" uuid NOT NULL,
	CONSTRAINT "vocab_to_package_vocab_id_package_id_pk" PRIMARY KEY("vocab_id","package_id")
);
--> statement-breakpoint
CREATE TABLE "vodex_packages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"learning_space_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"source" text NOT NULL,
	"source_id" uuid,
	"mini_story_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "vocab_to_package" ADD CONSTRAINT "vocab_to_package_vocab_id_vocabularies_id_fk" FOREIGN KEY ("vocab_id") REFERENCES "public"."vocabularies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vocab_to_package" ADD CONSTRAINT "vocab_to_package_package_id_vodex_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."vodex_packages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vodex_packages" ADD CONSTRAINT "vodex_packages_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vodex_packages" ADD CONSTRAINT "vodex_packages_learning_space_id_learning_spaces_id_fk" FOREIGN KEY ("learning_space_id") REFERENCES "public"."learning_spaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vodex_packages" ADD CONSTRAINT "vodex_packages_mini_story_id_mini_stories_id_fk" FOREIGN KEY ("mini_story_id") REFERENCES "public"."mini_stories"("id") ON DELETE set null ON UPDATE no action;