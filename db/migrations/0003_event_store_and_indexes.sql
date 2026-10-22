CREATE TABLE "domain_events" (
	"sequence" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "domain_events_sequence_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"aggregate_type" varchar(30) NOT NULL,
	"aggregate_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"type" varchar(60) NOT NULL,
	"payload" jsonb NOT NULL,
	"actor_id" uuid,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb,
	CONSTRAINT "domain_events_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "hero_stats" (
	"hero_id" uuid PRIMARY KEY NOT NULL,
	"interventions" integer DEFAULT 0 NOT NULL,
	"succeeded" integer DEFAULT 0 NOT NULL,
	"failed" integer DEFAULT 0 NOT NULL,
	"citizens_saved" bigint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hero_villain_stats" (
	"hero_id" uuid NOT NULL,
	"villain_id" uuid NOT NULL,
	"encounters" integer DEFAULT 0 NOT NULL,
	"imprisonments" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "hero_villain_stats_hero_id_villain_id_pk" PRIMARY KEY("hero_id","villain_id")
);
--> statement-breakpoint
CREATE TABLE "idempotency_keys" (
	"key" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"method" varchar(10) NOT NULL,
	"path" text NOT NULL,
	"status" integer,
	"response" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "incident_counts" (
	"status" "incident_status" NOT NULL,
	"type_id" smallint NOT NULL,
	"priority" varchar(10) NOT NULL,
	"deleted" boolean NOT NULL,
	"incidents" integer DEFAULT 0 NOT NULL,
	"people_involved" bigint DEFAULT 0 NOT NULL,
	CONSTRAINT "incident_counts_status_type_id_priority_deleted_pk" PRIMARY KEY("status","type_id","priority","deleted")
);
--> statement-breakpoint
CREATE TABLE "villain_stats" (
	"villain_id" uuid PRIMARY KEY NOT NULL,
	"incidents" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
DROP INDEX "incidents_status_priority_idx";--> statement-breakpoint
DROP INDEX "incidents_reporter_id_idx";--> statement-breakpoint
DROP INDEX "incidents_hero_id_idx";--> statement-breakpoint
DROP INDEX "incidents_villain_id_idx";--> statement-breakpoint
ALTER TABLE "domain_events" ADD CONSTRAINT "domain_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_stats" ADD CONSTRAINT "hero_stats_hero_id_users_id_fk" FOREIGN KEY ("hero_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_villain_stats" ADD CONSTRAINT "hero_villain_stats_hero_id_users_id_fk" FOREIGN KEY ("hero_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hero_villain_stats" ADD CONSTRAINT "hero_villain_stats_villain_id_villains_id_fk" FOREIGN KEY ("villain_id") REFERENCES "public"."villains"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incident_counts" ADD CONSTRAINT "incident_counts_type_id_incident_types_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."incident_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "villain_stats" ADD CONSTRAINT "villain_stats_villain_id_villains_id_fk" FOREIGN KEY ("villain_id") REFERENCES "public"."villains"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "domain_events_stream_idx" ON "domain_events" USING btree ("aggregate_type","aggregate_id","version");--> statement-breakpoint
CREATE INDEX "domain_events_type_idx" ON "domain_events" USING btree ("type","sequence");--> statement-breakpoint
CREATE INDEX "idempotency_keys_created_at_idx" ON "idempotency_keys" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "incidents_created_at_idx" ON "incidents" USING btree ("created_at") WHERE "incidents"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "incidents_status_created_at_idx" ON "incidents" USING btree ("status","created_at") WHERE "incidents"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "incidents_type_created_at_idx" ON "incidents" USING btree ("type_id","created_at") WHERE "incidents"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "incidents_priority_rank_idx" ON "incidents" USING btree ((case when "priority" = 'HIGH' then 0 when "priority" is null then 1 when "priority" = 'NORMAL' then 2 else 3 end),"created_at" DESC NULLS FIRST) WHERE "incidents"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "incidents_active_idx" ON "incidents" USING btree ("created_at") WHERE "incidents"."status" IN ('REPORTED', 'IN_PROGRESS') AND "incidents"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "incidents_ended_at_idx" ON "incidents" USING btree ("intervention_ended_at") WHERE "incidents"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "incidents_reporter_created_at_idx" ON "incidents" USING btree ("reporter_id","created_at");--> statement-breakpoint
CREATE INDEX "incidents_hero_created_at_idx" ON "incidents" USING btree ("hero_id","created_at") WHERE "incidents"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "incidents_hero_started_at_idx" ON "incidents" USING btree ("hero_id","intervention_started_at") WHERE "incidents"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "incidents_villain_created_at_idx" ON "incidents" USING btree ("villain_id","created_at") WHERE "incidents"."deleted_at" IS NULL;--> statement-breakpoint
-- Existing incidents enter the journal as IncidentImported events (snapshot "after").
INSERT INTO "domain_events" ("aggregate_type", "aggregate_id", "version", "type", "payload", "actor_id", "occurred_at", "recorded_at", "metadata")
SELECT 'incident', i."id", 1, 'IncidentImported',
       jsonb_build_object('before', null, 'after', jsonb_build_object(
         'typeId', i."type_id", 'status', i."status", 'priority', i."priority", 'deleted', i."deleted_at" IS NOT NULL,
         'peopleInvolved', i."people_involved", 'heroId', i."hero_id", 'villainId', i."villain_id",
         'villainImprisoned', i."villain_imprisoned")),
       i."reporter_id", i."created_at", now(), '{"source": "migration"}'::jsonb
FROM "incidents" i;
--> statement-breakpoint
-- Projections. With exactly one IncidentImported event per incident, replaying the journal
-- (lib/server/events/projections.ts) amounts to aggregating the incidents: done directly, faster.
INSERT INTO "incident_counts" ("status", "type_id", "priority", "deleted", "incidents", "people_involved")
SELECT "status", "type_id", coalesce("priority"::text, 'NONE'), "deleted_at" IS NOT NULL, count(*), sum("people_involved")
FROM "incidents" GROUP BY 1, 2, 3, 4;
--> statement-breakpoint
INSERT INTO "hero_stats" ("hero_id", "interventions", "succeeded", "failed", "citizens_saved")
SELECT "hero_id", count(*), count(*) FILTER (WHERE "status" = 'SUCCEEDED'), count(*) FILTER (WHERE "status" = 'FAILED'),
       coalesce(sum("people_involved") FILTER (WHERE "status" = 'SUCCEEDED'), 0)
FROM "incidents" WHERE "deleted_at" IS NULL AND "hero_id" IS NOT NULL GROUP BY 1;
--> statement-breakpoint
INSERT INTO "hero_villain_stats" ("hero_id", "villain_id", "encounters", "imprisonments")
SELECT "hero_id", "villain_id", count(*), count(*) FILTER (WHERE "villain_imprisoned")
FROM "incidents" WHERE "deleted_at" IS NULL AND "hero_id" IS NOT NULL AND "villain_id" IS NOT NULL GROUP BY 1, 2;
--> statement-breakpoint
INSERT INTO "villain_stats" ("villain_id", "incidents")
SELECT "villain_id", count(*) FROM "incidents" WHERE "deleted_at" IS NULL AND "villain_id" IS NOT NULL GROUP BY 1;
