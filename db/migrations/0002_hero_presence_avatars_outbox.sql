CREATE TABLE "mail_outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"to_email" varchar(255) NOT NULL,
	"subject" varchar(255) NOT NULL,
	"html" text NOT NULL,
	"text" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_avatars" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"mime_type" varchar(50) NOT NULL,
	"data" "bytea" NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "hero_profiles" ADD COLUMN "powers" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "hero_profiles" ADD COLUMN "latitude" double precision;--> statement-breakpoint
ALTER TABLE "hero_profiles" ADD COLUMN "longitude" double precision;--> statement-breakpoint
ALTER TABLE "hero_profiles" ADD COLUMN "location_updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "hero_profiles" ADD COLUMN "on_duty" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "user_avatars" ADD CONSTRAINT "user_avatars_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mail_outbox_created_at_idx" ON "mail_outbox" USING btree ("created_at");