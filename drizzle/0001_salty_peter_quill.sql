CREATE TABLE "companies" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "users_name_lower_idx";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "company_id" integer;--> statement-breakpoint
CREATE UNIQUE INDEX "companies_name_lower_idx" ON "companies" USING btree (lower("name"));--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "users_name_lower_idx" ON "users" USING btree (lower("name"));