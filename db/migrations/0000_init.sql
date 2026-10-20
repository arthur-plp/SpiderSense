CREATE TYPE "public"."article_status" AS ENUM('DRAFT', 'PUBLISHED');--> statement-breakpoint
CREATE TYPE "public"."civility" AS ENUM('MR', 'MRS', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."incident_priority" AS ENUM('HIGH', 'NORMAL', 'LOW');--> statement-breakpoint
CREATE TYPE "public"."incident_status" AS ENUM('REPORTED', 'IN_PROGRESS', 'SUCCEEDED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."moderation_status" AS ENUM('VISIBLE', 'HIDDEN');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."token_type" AS ENUM('ACCOUNT_ACTIVATION', 'PASSWORD_RESET');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('CITIZEN', 'HERO', 'MODERATOR', 'ADMIN');--> statement-breakpoint
CREATE TYPE "public"."villain_status" AS ENUM('AT_LARGE', 'IMPRISONED');--> statement-breakpoint
CREATE TABLE "activity_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"action" varchar(100) NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"content_html" text NOT NULL,
	"cover_url" text,
	"author_id" uuid,
	"status" "article_status" DEFAULT 'DRAFT' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "articles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "email_change_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"new_email" varchar(255) NOT NULL,
	"status" "review_status" DEFAULT 'PENDING' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_movies" (
	"hero_id" uuid NOT NULL,
	"movie_id" uuid NOT NULL,
	"status" "review_status" DEFAULT 'PENDING' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hero_movies_hero_id_movie_id_pk" PRIMARY KEY("hero_id","movie_id")
);
--> statement-breakpoint
CREATE TABLE "hero_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"alias" varchar(100) NOT NULL,
	"bio" text,
	"status" "review_status" DEFAULT 'PENDING' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"incident_id" uuid NOT NULL,
	"citizen_id" uuid,
	"hero_id" uuid NOT NULL,
	"rating" smallint NOT NULL,
	"comment" text,
	"hero_reply" text,
	"replied_at" timestamp with time zone,
	"moderation_status" "moderation_status" DEFAULT 'VISIBLE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hero_reviews_incident_id_unique" UNIQUE("incident_id"),
	CONSTRAINT "hero_reviews_rating_range" CHECK ("hero_reviews"."rating" BETWEEN 1 AND 5)
);
--> statement-breakpoint
CREATE TABLE "incident_types" (
	"id" smallint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "incident_types_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 32767 START WITH 1 CACHE 1),
	"code" varchar(50) NOT NULL,
	"label" varchar(100) NOT NULL,
	"endangers_citizens" boolean DEFAULT false NOT NULL,
	CONSTRAINT "incident_types_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "incidents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporter_id" uuid,
	"type_id" smallint NOT NULL,
	"villain_id" uuid,
	"reported_villain_name" varchar(100),
	"description" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"people_involved" integer DEFAULT 0 NOT NULL,
	"street" varchar(255),
	"postal_code" varchar(10),
	"city" varchar(100) NOT NULL,
	"country" varchar(100) NOT NULL,
	"latitude" double precision,
	"longitude" double precision,
	"status" "incident_status" DEFAULT 'REPORTED' NOT NULL,
	"priority" "incident_priority",
	"hero_id" uuid,
	"intervention_started_at" timestamp with time zone,
	"intervention_ended_at" timestamp with time zone,
	"villain_imprisoned" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "incidents_people_involved_positive" CHECK ("incidents"."people_involved" >= 0),
	CONSTRAINT "incidents_intervention_matches_status" CHECK (("incidents"."status" = 'REPORTED' AND "incidents"."hero_id" IS NULL AND "incidents"."intervention_started_at" IS NULL AND "incidents"."intervention_ended_at" IS NULL)
        OR ("incidents"."status" = 'IN_PROGRESS' AND "incidents"."hero_id" IS NOT NULL AND "incidents"."intervention_started_at" IS NOT NULL AND "incidents"."intervention_ended_at" IS NULL)
        OR ("incidents"."status" IN ('SUCCEEDED', 'FAILED') AND "incidents"."hero_id" IS NOT NULL AND "incidents"."intervention_started_at" IS NOT NULL AND "incidents"."intervention_ended_at" IS NOT NULL)),
	CONSTRAINT "incidents_imprisoned_only_if_succeeded" CHECK (NOT "incidents"."villain_imprisoned" OR "incidents"."status" = 'SUCCEEDED')
);
--> statement-breakpoint
CREATE TABLE "movies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"imdb_id" varchar(20) NOT NULL,
	"title" varchar(255) NOT NULL,
	"year" smallint,
	"poster_url" text,
	"synopsis" text,
	"raw_data" jsonb,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "movies_imdb_id_unique" UNIQUE("imdb_id")
);
--> statement-breakpoint
CREATE TABLE "newsletter_sends" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"newsletter_id" uuid NOT NULL,
	"subscription_id" uuid NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "newsletter_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"user_id" uuid,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"unsubscribe_token" uuid DEFAULT gen_random_uuid() NOT NULL,
	"subscribed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "newsletter_subscriptions_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "newsletter_subscriptions_unsubscribe_token_unique" UNIQUE("unsubscribe_token")
);
--> statement-breakpoint
CREATE TABLE "newsletters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject" varchar(255) NOT NULL,
	"content_html" text NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "user_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "token_type" NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"civility" "civility" NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"birth_date" date NOT NULL,
	"phone" varchar(20) NOT NULL,
	"street" varchar(255) NOT NULL,
	"address_complement" varchar(255),
	"postal_code" varchar(10) NOT NULL,
	"city" varchar(100) NOT NULL,
	"country" varchar(100) NOT NULL,
	"avatar_url" text,
	"role" "user_role" DEFAULT 'CITIZEN' NOT NULL,
	"email_verified_at" timestamp with time zone,
	"verified_at" timestamp with time zone,
	"verified_by" uuid,
	"disabled_at" timestamp with time zone,
	"disabled_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "villain_specialties" (
	"villain_id" uuid NOT NULL,
	"incident_type_id" smallint NOT NULL,
	CONSTRAINT "villain_specialties_villain_id_incident_type_id_pk" PRIMARY KEY("villain_id","incident_type_id")
);
--> statement-breakpoint
CREATE TABLE "villains" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"alias" varchar(100) NOT NULL,
	"first_name" varchar(100),
	"last_name" varchar(100),
	"description" text,
	"main_sector" varchar(255),
	"image_url" text,
	"status" "villain_status" DEFAULT 'AT_LARGE' NOT NULL,
	"imprisoned_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_change_requests" ADD CONSTRAINT "email_change_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_change_requests" ADD CONSTRAINT "email_change_requests_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_movies" ADD CONSTRAINT "hero_movies_hero_id_users_id_fk" FOREIGN KEY ("hero_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_movies" ADD CONSTRAINT "hero_movies_movie_id_movies_id_fk" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_movies" ADD CONSTRAINT "hero_movies_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_profiles" ADD CONSTRAINT "hero_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_profiles" ADD CONSTRAINT "hero_profiles_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_reviews" ADD CONSTRAINT "hero_reviews_incident_id_incidents_id_fk" FOREIGN KEY ("incident_id") REFERENCES "public"."incidents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_reviews" ADD CONSTRAINT "hero_reviews_citizen_id_users_id_fk" FOREIGN KEY ("citizen_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_reviews" ADD CONSTRAINT "hero_reviews_hero_id_users_id_fk" FOREIGN KEY ("hero_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_type_id_incident_types_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."incident_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_villain_id_villains_id_fk" FOREIGN KEY ("villain_id") REFERENCES "public"."villains"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_hero_id_users_id_fk" FOREIGN KEY ("hero_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "newsletter_sends" ADD CONSTRAINT "newsletter_sends_newsletter_id_newsletters_id_fk" FOREIGN KEY ("newsletter_id") REFERENCES "public"."newsletters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "newsletter_sends" ADD CONSTRAINT "newsletter_sends_subscription_id_newsletter_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."newsletter_subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "newsletter_subscriptions" ADD CONSTRAINT "newsletter_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "newsletters" ADD CONSTRAINT "newsletters_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_tokens" ADD CONSTRAINT "user_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_disabled_by_users_id_fk" FOREIGN KEY ("disabled_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "villain_specialties" ADD CONSTRAINT "villain_specialties_villain_id_villains_id_fk" FOREIGN KEY ("villain_id") REFERENCES "public"."villains"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "villain_specialties" ADD CONSTRAINT "villain_specialties_incident_type_id_incident_types_id_fk" FOREIGN KEY ("incident_type_id") REFERENCES "public"."incident_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "villains" ADD CONSTRAINT "villains_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_logs_entity_idx" ON "activity_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "activity_logs_created_at_idx" ON "activity_logs" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "email_change_requests_one_pending_per_user" ON "email_change_requests" USING btree ("user_id") WHERE "email_change_requests"."status" = 'PENDING';--> statement-breakpoint
CREATE UNIQUE INDEX "hero_profiles_alias_unique" ON "hero_profiles" USING btree (lower("alias"));--> statement-breakpoint
CREATE INDEX "hero_reviews_hero_id_idx" ON "hero_reviews" USING btree ("hero_id");--> statement-breakpoint
CREATE UNIQUE INDEX "incidents_one_active_intervention_per_hero" ON "incidents" USING btree ("hero_id") WHERE "incidents"."status" = 'IN_PROGRESS' AND "incidents"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "incidents_status_priority_idx" ON "incidents" USING btree ("status","priority");--> statement-breakpoint
CREATE INDEX "incidents_reporter_id_idx" ON "incidents" USING btree ("reporter_id");--> statement-breakpoint
CREATE INDEX "incidents_hero_id_idx" ON "incidents" USING btree ("hero_id");--> statement-breakpoint
CREATE INDEX "incidents_villain_id_idx" ON "incidents" USING btree ("villain_id");--> statement-breakpoint
CREATE INDEX "newsletter_sends_newsletter_id_idx" ON "newsletter_sends" USING btree ("newsletter_id");--> statement-breakpoint
CREATE UNIQUE INDEX "newsletter_subscriptions_email_unique" ON "newsletter_subscriptions" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_tokens_user_id_idx" ON "user_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree (lower("email"));--> statement-breakpoint
CREATE UNIQUE INDEX "villains_alias_unique" ON "villains" USING btree (lower("alias"));