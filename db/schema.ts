import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  check,
  customType,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

// --- Enums ------------------------------------------------------------------

export const civility = pgEnum("civility", ["MR", "MRS", "OTHER"]);

export const userRole = pgEnum("user_role", [
  "CITIZEN",
  "HERO",
  "MODERATOR",
  "ADMIN",
]);

// Shared by every request that needs a moderator's decision.
export const reviewStatus = pgEnum("review_status", [
  "PENDING",
  "APPROVED",
  "REJECTED",
]);

export const tokenType = pgEnum("token_type", [
  "ACCOUNT_ACTIVATION",
  "PASSWORD_RESET",
]);

export const villainStatus = pgEnum("villain_status", [
  "AT_LARGE",
  "IMPRISONED",
]);

export const incidentStatus = pgEnum("incident_status", [
  "REPORTED",
  "IN_PROGRESS",
  "SUCCEEDED",
  "FAILED",
]);

export const incidentPriority = pgEnum("incident_priority", [
  "HIGH",
  "NORMAL",
  "LOW",
]);

export const moderationStatus = pgEnum("moderation_status", [
  "VISIBLE",
  "HIDDEN",
]);

export const articleStatus = pgEnum("article_status", ["DRAFT", "PUBLISHED"]);

// node-postgres returns a Buffer, PGlite a Uint8Array.
const bytea = customType<{ data: Buffer; driverData: Uint8Array }>({
  dataType: () => "bytea",
  fromDriver: (value) => Buffer.from(value),
});

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

// --- Users & authentication ----------------------------------------------

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 255 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    civility: civility("civility").notNull(),
    firstName: varchar("first_name", { length: 100 }).notNull(),
    lastName: varchar("last_name", { length: 100 }).notNull(),
    birthDate: date("birth_date").notNull(),
    phone: varchar("phone", { length: 20 }).notNull(),
    street: varchar("street", { length: 255 }).notNull(),
    addressComplement: varchar("address_complement", { length: 255 }),
    postalCode: varchar("postal_code", { length: 10 }).notNull(),
    city: varchar("city", { length: 100 }).notNull(),
    country: varchar("country", { length: 100 }).notNull(),
    avatarUrl: text("avatar_url"),
    role: userRole("role").notNull().default("CITIZEN"),
    // Set when the user clicks the activation link.
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    // Set when a moderator marks the account as "Citoyen vérifié".
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    verifiedBy: uuid("verified_by").references((): AnyPgColumn => users.id, {
      onDelete: "set null",
    }),
    disabledAt: timestamp("disabled_at", { withTimezone: true }),
    disabledBy: uuid("disabled_by").references((): AnyPgColumn => users.id, {
      onDelete: "set null",
    }),
    ...timestamps,
  },
  (t) => [uniqueIndex("users_email_unique").on(sql`lower(${t.email})`)],
);

export const heroProfiles = pgTable(
  "hero_profiles",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    // Also used as a login identifier.
    alias: varchar("alias", { length: 100 }).notNull(),
    bio: text("bio"),
    powers: text("powers").array().notNull().default(sql`'{}'::text[]`),
    // Last known position, used by citizens to find the nearest hero.
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    locationUpdatedAt: timestamp("location_updated_at", { withTimezone: true }),
    // Off duty heroes are listed but shown as unavailable.
    onDuty: boolean("on_duty").notNull().default(true),
    status: reviewStatus("status").notNull().default("PENDING"),
    reviewedBy: uuid("reviewed_by").references(() => users.id, {
      onDelete: "set null",
    }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [uniqueIndex("hero_profiles_alias_unique").on(sql`lower(${t.alias})`)],
);

// Kept in the database so uploads survive redeploys without file storage.
export const userAvatars = pgTable("user_avatars", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  mimeType: varchar("mime_type", { length: 50 }).notNull(),
  data: bytea("data").notNull(),
  updatedAt: timestamps.updatedAt,
});

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    createdAt: timestamps.createdAt,
  },
  (t) => [index("sessions_user_id_idx").on(t.userId)],
);

// Single-use links sent by email (account activation, password reset).
export const userTokens = pgTable(
  "user_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: tokenType("type").notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamps.createdAt,
  },
  (t) => [index("user_tokens_user_id_idx").on(t.userId)],
);

// Changing an email address requires a moderator's approval.
export const emailChangeRequests = pgTable(
  "email_change_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    newEmail: varchar("new_email", { length: 255 }).notNull(),
    status: reviewStatus("status").notNull().default("PENDING"),
    reviewedBy: uuid("reviewed_by").references(() => users.id, {
      onDelete: "set null",
    }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamps.createdAt,
  },
  (t) => [
    uniqueIndex("email_change_requests_one_pending_per_user")
      .on(t.userId)
      .where(sql`${t.status} = 'PENDING'`),
  ],
);

// --- Villains & incidents --------------------------------------------------

export const incidentTypes = pgTable("incident_types", {
  id: smallint("id").primaryKey().generatedAlwaysAsIdentity(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  label: varchar("label", { length: 100 }).notNull(),
  // Counts towards "citoyens en danger secourus" (attempted murder: yes, theft: no).
  endangersCitizens: boolean("endangers_citizens").notNull().default(false),
});

export const villains = pgTable(
  "villains",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    alias: varchar("alias", { length: 100 }).notNull(),
    firstName: varchar("first_name", { length: 100 }),
    lastName: varchar("last_name", { length: 100 }),
    description: text("description"),
    mainSector: varchar("main_sector", { length: 255 }),
    imageUrl: text("image_url"),
    status: villainStatus("status").notNull().default("AT_LARGE"),
    imprisonedAt: timestamp("imprisoned_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    ...timestamps,
  },
  (t) => [uniqueIndex("villains_alias_unique").on(sql`lower(${t.alias})`)],
);

export const villainSpecialties = pgTable(
  "villain_specialties",
  {
    villainId: uuid("villain_id")
      .notNull()
      .references(() => villains.id, { onDelete: "cascade" }),
    incidentTypeId: smallint("incident_type_id")
      .notNull()
      .references(() => incidentTypes.id, { onDelete: "restrict" }),
  },
  (t) => [primaryKey({ columns: [t.villainId, t.incidentTypeId] })],
);

// An incident has at most one intervention: a failed one stays FAILED,
// so the intervention lives directly on the incident.
export const incidents = pgTable(
  "incidents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Nullable so a reporter's account can be erased (GDPR) without losing stats.
    reporterId: uuid("reporter_id").references(() => users.id, {
      onDelete: "set null",
    }),
    typeId: smallint("type_id")
      .notNull()
      .references(() => incidentTypes.id, { onDelete: "restrict" }),
    // Linked later by a moderator or hero; the citizen may only know a name.
    villainId: uuid("villain_id").references(() => villains.id, {
      onDelete: "set null",
    }),
    reportedVillainName: varchar("reported_villain_name", { length: 100 }),
    description: text("description").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    // Number of citizens involved, used for the "citoyens secourus" stats.
    peopleInvolved: integer("people_involved").notNull().default(0),
    street: varchar("street", { length: 255 }),
    postalCode: varchar("postal_code", { length: 10 }),
    city: varchar("city", { length: 100 }).notNull(),
    country: varchar("country", { length: 100 }).notNull(),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    status: incidentStatus("status").notNull().default("REPORTED"),
    priority: incidentPriority("priority"),
    heroId: uuid("hero_id").references(() => users.id, {
      onDelete: "restrict",
    }),
    interventionStartedAt: timestamp("intervention_started_at", {
      withTimezone: true,
    }),
    interventionEndedAt: timestamp("intervention_ended_at", {
      withTimezone: true,
    }),
    villainImprisoned: boolean("villain_imprisoned").notNull().default(false),
    // Soft delete, so the reporter can still be notified (e.g. duplicates).
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedBy: uuid("deleted_by").references(() => users.id, {
      onDelete: "set null",
    }),
    ...timestamps,
  },
  (t) => [
    // "1 intervention à la fois" per hero, enforced by the database.
    uniqueIndex("incidents_one_active_intervention_per_hero")
      .on(t.heroId)
      .where(sql`${t.status} = 'IN_PROGRESS' AND ${t.deletedAt} IS NULL`),
    index("incidents_status_priority_idx").on(t.status, t.priority),
    index("incidents_reporter_id_idx").on(t.reporterId),
    index("incidents_hero_id_idx").on(t.heroId),
    index("incidents_villain_id_idx").on(t.villainId),
    check("incidents_people_involved_positive", sql`${t.peopleInvolved} >= 0`),
    check(
      "incidents_intervention_matches_status",
      sql`(${t.status} = 'REPORTED' AND ${t.heroId} IS NULL AND ${t.interventionStartedAt} IS NULL AND ${t.interventionEndedAt} IS NULL)
        OR (${t.status} = 'IN_PROGRESS' AND ${t.heroId} IS NOT NULL AND ${t.interventionStartedAt} IS NOT NULL AND ${t.interventionEndedAt} IS NULL)
        OR (${t.status} IN ('SUCCEEDED', 'FAILED') AND ${t.heroId} IS NOT NULL AND ${t.interventionStartedAt} IS NOT NULL AND ${t.interventionEndedAt} IS NOT NULL)`,
    ),
    check(
      "incidents_imprisoned_only_if_succeeded",
      sql`NOT ${t.villainImprisoned} OR ${t.status} = 'SUCCEEDED'`,
    ),
  ],
);

// A citizen rates the hero who handled their incident (one review per incident).
export const heroReviews = pgTable(
  "hero_reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    incidentId: uuid("incident_id")
      .notNull()
      .unique()
      .references(() => incidents.id, { onDelete: "cascade" }),
    citizenId: uuid("citizen_id").references(() => users.id, {
      onDelete: "set null",
    }),
    heroId: uuid("hero_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    rating: smallint("rating").notNull(),
    comment: text("comment"),
    heroReply: text("hero_reply"),
    repliedAt: timestamp("replied_at", { withTimezone: true }),
    moderationStatus: moderationStatus("moderation_status")
      .notNull()
      .default("VISIBLE"),
    createdAt: timestamps.createdAt,
  },
  (t) => [
    index("hero_reviews_hero_id_idx").on(t.heroId),
    check("hero_reviews_rating_range", sql`${t.rating} BETWEEN 1 AND 5`),
  ],
);

// --- Video library -----------------------------------------------------------

// Local cache of IMDb data, so pages don't hit the API on every render.
export const movies = pgTable("movies", {
  id: uuid("id").primaryKey().defaultRandom(),
  imdbId: varchar("imdb_id", { length: 20 }).notNull().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  year: smallint("year"),
  posterUrl: text("poster_url"),
  synopsis: text("synopsis"),
  rawData: jsonb("raw_data"),
  fetchedAt: timestamp("fetched_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// A hero's movie only shows up once a moderator approves it.
export const heroMovies = pgTable(
  "hero_movies",
  {
    heroId: uuid("hero_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    movieId: uuid("movie_id")
      .notNull()
      .references(() => movies.id, { onDelete: "cascade" }),
    status: reviewStatus("status").notNull().default("PENDING"),
    reviewedBy: uuid("reviewed_by").references(() => users.id, {
      onDelete: "set null",
    }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamps.createdAt,
  },
  (t) => [primaryKey({ columns: [t.heroId, t.movieId] })],
);

// --- Newsletter, blog & audit ------------------------------------------------

// Unsubscribing deletes the row: no data is kept once it's no longer needed.
export const newsletterSubscriptions = pgTable(
  "newsletter_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 255 }).notNull(),
    // Linked when an account exists with the same email.
    userId: uuid("user_id")
      .unique()
      .references(() => users.id, { onDelete: "set null" }),
    isEnabled: boolean("is_enabled").notNull().default(true),
    unsubscribeToken: uuid("unsubscribe_token")
      .notNull()
      .unique()
      .defaultRandom(),
    subscribedAt: timestamp("subscribed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("newsletter_subscriptions_email_unique").on(
      sql`lower(${t.email})`,
    ),
  ],
);

export const newsletters = pgTable("newsletters", {
  id: uuid("id").primaryKey().defaultRandom(),
  subject: varchar("subject", { length: 255 }).notNull(),
  contentHtml: text("content_html").notNull(),
  createdBy: uuid("created_by").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: timestamps.createdAt,
});

export const newsletterSends = pgTable(
  "newsletter_sends",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    newsletterId: uuid("newsletter_id")
      .notNull()
      .references(() => newsletters.id, { onDelete: "cascade" }),
    subscriptionId: uuid("subscription_id")
      .notNull()
      .references(() => newsletterSubscriptions.id, { onDelete: "cascade" }),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("newsletter_sends_newsletter_id_idx").on(t.newsletterId)],
);

export const articles = pgTable("articles", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  contentHtml: text("content_html").notNull(),
  coverUrl: text("cover_url"),
  authorId: uuid("author_id").references(() => users.id, {
    onDelete: "set null",
  }),
  status: articleStatus("status").notNull().default("DRAFT"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  ...timestamps,
});

// Only filled when no SMTP server is configured: emails are then readable
// from the in-app preview mailbox instead of being sent.
export const mailOutbox = pgTable(
  "mail_outbox",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    toEmail: varchar("to_email", { length: 255 }).notNull(),
    subject: varchar("subject", { length: 255 }).notNull(),
    html: text("html").notNull(),
    text: text("text").notNull(),
    createdAt: timestamps.createdAt,
  },
  (t) => [index("mail_outbox_created_at_idx").on(t.createdAt)],
);

// Lets moderators supervise what users do on the platform.
export const activityLogs = pgTable(
  "activity_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: uuid("actor_id").references(() => users.id, {
      onDelete: "set null",
    }),
    action: varchar("action", { length: 100 }).notNull(),
    entityType: varchar("entity_type", { length: 50 }).notNull(),
    entityId: text("entity_id"),
    metadata: jsonb("metadata"),
    createdAt: timestamps.createdAt,
  },
  (t) => [
    index("activity_logs_entity_idx").on(t.entityType, t.entityId),
    index("activity_logs_created_at_idx").on(t.createdAt),
  ],
);
