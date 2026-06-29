ALTER TABLE "routes" ADD COLUMN "start_label" text DEFAULT 'Home' NOT NULL;--> statement-breakpoint
ALTER TABLE "routes" ADD COLUMN "end_label" text DEFAULT 'Office' NOT NULL;