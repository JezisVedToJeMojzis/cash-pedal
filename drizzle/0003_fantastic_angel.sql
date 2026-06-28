ALTER TABLE "rides" ADD COLUMN "start_point" text;--> statement-breakpoint
ALTER TABLE "rides" ADD COLUMN "end_point" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "home_address" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "office_address" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "commute_distance_m" double precision;