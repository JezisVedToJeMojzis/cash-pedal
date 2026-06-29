CREATE TABLE "routes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text,
	"start_address" text NOT NULL,
	"end_address" text NOT NULL,
	"distance_m" double precision NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "routes" ADD CONSTRAINT "routes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "routes_user_idx" ON "routes" USING btree ("user_id");--> statement-breakpoint
INSERT INTO "routes" ("user_id", "name", "start_address", "end_address", "distance_m")
SELECT "id", 'Commute', "home_address", "office_address", "commute_distance_m"
FROM "users"
WHERE "home_address" IS NOT NULL AND "office_address" IS NOT NULL AND "commute_distance_m" IS NOT NULL;