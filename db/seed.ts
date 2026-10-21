import { count, eq } from "drizzle-orm";
import { hashPassword } from "../lib/server/password";
import type { Database } from "./index";
import * as s from "./schema";
import {
  ARTICLES,
  CITIZENS,
  DEMO_PASSWORD,
  HERO_REPLIES,
  HEROES,
  INCIDENT_DESCRIPTIONS,
  MOVIES,
  PENDING_HERO_MOVIES,
  PLACES,
  type Place,
  REVIEW_COMMENTS,
  VILLAINS,
} from "./seed-data";

type IncidentInsert = typeof s.incidents.$inferInsert & { id: string };

/** Seeds the demo dataset on an empty database. Returns true if it ran. */
export async function seedDemoDataIfEmpty(db: Database): Promise<boolean> {
  const [{ value }] = await db.select({ value: count() }).from(s.users);
  if (value > 0) return false;
  await seedDemoData(db);
  return true;
}

// Deterministic PRNG so every fresh demo database looks the same.
function createRandom(seed: number) {
  let state = seed;
  const next = () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min: number, max: number) => Math.floor(next() * (max - min + 1)) + min,
    pick: <T>(items: readonly T[]): T => items[Math.floor(next() * items.length)],
    chance: (probability: number) => next() < probability,
  };
}

const placeByName = new Map(PLACES.map((place) => [place.name, place]));
function place(name: string): Place {
  const found = placeByName.get(name);
  if (!found) throw new Error(`Unknown demo place: ${name}`);
  return found;
}

async function fetchPosters(imdbIds: string[]): Promise<Map<string, string>> {
  const posters = new Map<string, string>();
  const results = await Promise.allSettled(
    imdbIds.map(async (imdbId) => {
      const response = await fetch(
        `https://v3.sg.media-imdb.com/suggestion/x/${imdbId}.json`,
        { signal: AbortSignal.timeout(4000) },
      );
      if (!response.ok) return;
      const body = (await response.json()) as {
        d?: { id: string; i?: { imageUrl?: string } }[];
      };
      const imageUrl = body.d?.find((item) => item.id === imdbId)?.i?.imageUrl;
      if (imageUrl) posters.set(imdbId, imageUrl);
    }),
  );
  // Offline: posters stay empty and the UI falls back to a styled placeholder.
  void results;
  return posters;
}

export async function seedDemoData(db: Database): Promise<void> {
  const random = createRandom(2025);
  const now = Date.now();
  const minutesAgo = (minutes: number) => new Date(now - minutes * 60_000);
  const daysAgo = (days: number) => minutesAgo(days * 24 * 60);
  const addMinutes = (date: Date, minutes: number) =>
    new Date(date.getTime() + minutes * 60_000);
  const jitter = (value: number, amount = 0.004) =>
    value + (random.next() - 0.5) * 2 * amount;
  const phone = () =>
    `06 ${Array.from({ length: 4 }, () => String(random.int(10, 99))).join(" ")}`;

  const [passwordHash, posters] = await Promise.all([
    hashPassword(DEMO_PASSWORD),
    fetchPosters(MOVIES.map((movie) => movie.imdbId)),
  ]);

  await db.transaction(async (tx) => {
    // --- Staff --------------------------------------------------------------
    const [admin, moderator] = await tx
      .insert(s.users)
      .values([
        {
          email: "admin@heros-sos.test",
          passwordHash,
          civility: "MR",
          firstName: "Nick",
          lastName: "Fury",
          birthDate: "1965-12-21",
          phone: phone(),
          street: "1 Place du Châtelet",
          postalCode: "75001",
          city: "Paris",
          country: "France",
          role: "ADMIN",
          emailVerifiedAt: daysAgo(200),
          verifiedAt: daysAgo(200),
          createdAt: daysAgo(200),
        },
        {
          email: "moderateur@heros-sos.test",
          passwordHash,
          civility: "MRS",
          firstName: "Maria",
          lastName: "Hill",
          birthDate: "1982-04-03",
          phone: phone(),
          street: "12 Rue de Rivoli",
          postalCode: "75004",
          city: "Paris",
          country: "France",
          role: "MODERATOR",
          emailVerifiedAt: daysAgo(190),
          verifiedAt: daysAgo(190),
          createdAt: daysAgo(190),
        },
      ])
      .returning({ id: s.users.id });

    // --- Citizens -----------------------------------------------------------
    const citizenRows = await tx
      .insert(s.users)
      .values(
        CITIZENS.map((citizen) => {
          const home = place(citizen.place);
          const createdAt = daysAgo(random.int(65, 150));
          return {
            email: citizen.email,
            passwordHash,
            civility: citizen.civility,
            firstName: citizen.firstName,
            lastName: citizen.lastName,
            birthDate: citizen.birthDate,
            phone: phone(),
            street: `${random.int(1, 120)} ${home.street}`,
            postalCode: home.postalCode,
            city: home.city,
            country: "France",
            role: "CITIZEN" as const,
            emailVerifiedAt: citizen.activated ? addMinutes(createdAt, 7) : null,
            verifiedAt: citizen.verified ? addMinutes(createdAt, 60 * 26) : null,
            verifiedBy: citizen.verified ? moderator.id : null,
            disabledAt: citizen.disabled ? daysAgo(20) : null,
            disabledBy: citizen.disabled ? moderator.id : null,
            createdAt,
          };
        }),
      )
      .returning({ id: s.users.id, email: s.users.email });
    const citizenId = new Map(
      CITIZENS.map((citizen, index) => [citizen.key, citizenRows[index].id]),
    );
    const activeReporters = CITIZENS.filter(
      (citizen) => citizen.activated && !citizen.disabled,
    ).map((citizen) => citizenId.get(citizen.key)!);
    const camille = citizenId.get("camille")!;
    const lucas = citizenId.get("lucas")!;

    // --- Heroes -------------------------------------------------------------
    const heroUsers = await tx
      .insert(s.users)
      .values(
        HEROES.map((hero) => {
          const home = place(hero.place);
          const createdAt = daysAgo(hero.status === "APPROVED" ? random.int(120, 180) : random.int(1, 6));
          return {
            email: `${hero.key}@heros-sos.test`,
            passwordHash,
            civility: hero.civility,
            firstName: hero.firstName,
            lastName: hero.lastName,
            birthDate: hero.birthDate,
            phone: phone(),
            street: `${random.int(1, 90)} ${home.street}`,
            postalCode: home.postalCode,
            city: home.city,
            country: "France",
            role: hero.status === "APPROVED" ? ("HERO" as const) : ("CITIZEN" as const),
            emailVerifiedAt: addMinutes(createdAt, 3),
            verifiedAt: hero.status === "APPROVED" ? addMinutes(createdAt, 60 * 20) : null,
            verifiedBy: hero.status === "APPROVED" ? admin.id : null,
            createdAt,
          };
        }),
      )
      .returning({ id: s.users.id, createdAt: s.users.createdAt });
    const heroId = new Map(HEROES.map((hero, index) => [hero.key, heroUsers[index].id]));

    await tx.insert(s.heroProfiles).values(
      HEROES.map((hero, index) => {
        const home = place(hero.place);
        const approved = hero.status === "APPROVED";
        return {
          userId: heroUsers[index].id,
          alias: hero.alias,
          bio: hero.bio,
          powers: hero.powers,
          latitude: jitter(home.lat, 0.006),
          longitude: jitter(home.lng, 0.006),
          locationUpdatedAt: minutesAgo(random.int(2, 50)),
          // One hero off duty so the "Hors service" state shows up.
          onDuty: hero.key !== "hulk",
          status: hero.status,
          reviewedBy: approved ? admin.id : null,
          reviewedAt: approved ? addMinutes(heroUsers[index].createdAt, 60 * 20) : null,
          createdAt: heroUsers[index].createdAt,
        };
      }),
    );
    const approvedHeroKeys = HEROES.filter((hero) => hero.status === "APPROVED").map((hero) => hero.key);

    // --- Reference data -----------------------------------------------------
    const types = await tx.select().from(s.incidentTypes);
    const typeByCode = new Map(types.map((type) => [type.code, type]));

    const villainRows = await tx
      .insert(s.villains)
      .values(
        VILLAINS.map((villain) => ({
          alias: villain.alias,
          firstName: villain.firstName,
          lastName: villain.lastName,
          description: villain.description,
          mainSector: villain.mainSector,
          createdBy: moderator.id,
          createdAt: daysAgo(random.int(90, 180)),
        })),
      )
      .returning({ id: s.villains.id });
    const villains = VILLAINS.map((villain, index) => ({ ...villain, id: villainRows[index].id }));
    await tx.insert(s.villainSpecialties).values(
      villains.flatMap((villain) =>
        villain.specialties.map((code) => ({
          villainId: villain.id,
          incidentTypeId: typeByCode.get(code)!.id,
        })),
      ),
    );

    // --- Movies ---------------------------------------------------------------
    const movieRows = await tx
      .insert(s.movies)
      .values(
        MOVIES.map((movie) => ({
          imdbId: movie.imdbId,
          title: movie.title,
          year: movie.year,
          synopsis: movie.synopsis,
          posterUrl: posters.get(movie.imdbId) ?? null,
        })),
      )
      .returning({ id: s.movies.id, imdbId: s.movies.imdbId });
    const movieId = new Map(movieRows.map((movie) => [movie.imdbId, movie.id]));
    await tx.insert(s.heroMovies).values([
      ...HEROES.flatMap((hero) =>
        hero.movies.map((imdbId) => ({
          heroId: heroId.get(hero.key)!,
          movieId: movieId.get(imdbId)!,
          status: "APPROVED" as const,
          reviewedBy: moderator.id,
          reviewedAt: daysAgo(random.int(30, 100)),
          createdAt: daysAgo(random.int(101, 115)),
        })),
      ),
      ...PENDING_HERO_MOVIES.map((pending) => ({
        heroId: heroId.get(pending.hero)!,
        movieId: movieId.get(pending.imdbId)!,
        status: "PENDING" as const,
        createdAt: daysAgo(random.int(1, 3)),
      })),
    ]);

    // --- Incidents ------------------------------------------------------------
    const typeCodes = Object.keys(INCIDENT_DESCRIPTIONS);
    const peopleFor = (code: string) => {
      switch (code) {
        case "HOSTAGE_TAKING":
          return random.int(4, 18);
        case "TERROR_ATTACK":
          return random.int(5, 30);
        case "KIDNAPPING":
        case "ATTEMPTED_KIDNAPPING":
        case "ATTEMPTED_MURDER":
        case "MURDER":
          return random.int(1, 3);
        default:
          return random.int(1, 4);
      }
    };
    const priorityFor = (code: string) =>
      typeByCode.get(code)!.endangersCitizens
        ? ("HIGH" as const)
        : random.pick(["NORMAL", "NORMAL", "LOW"] as const);
    const villainFor = (code: string, allowImprisoned: boolean) => {
      const candidates = villains.filter(
        (villain) => villain.specialties.includes(code) && (allowImprisoned || !villain.imprisoned),
      );
      return candidates.length > 0 && random.chance(0.8) ? random.pick(candidates) : null;
    };
    const describe = (code: string) => random.pick(INCIDENT_DESCRIPTIONS[code]);
    const located = (p: Place, amount = 0.004) => ({
      street: `${random.int(1, 140)} ${p.street}`,
      postalCode: p.postalCode,
      city: p.city,
      country: "France",
      latitude: jitter(p.lat, amount),
      longitude: jitter(p.lng, amount),
    });

    const incidents: IncidentInsert[] = [];

    // Closed interventions over the last two months.
    for (let index = 0; index < 46; index++) {
      const code = random.pick(typeCodes);
      const where = random.pick(PLACES);
      const occurredAt = minutesAgo(random.int(60 * 26, 60 * 24 * 60));
      const startedAt = addMinutes(occurredAt, random.int(3, 14));
      const villain = villainFor(code, true);
      incidents.push({
        id: crypto.randomUUID(),
        reporterId: index % 5 === 0 ? camille : random.pick(activeReporters),
        typeId: typeByCode.get(code)!.id,
        villainId: villain?.id ?? null,
        reportedVillainName: villain && random.chance(0.6) ? villain.alias : null,
        description: describe(code),
        occurredAt,
        peopleInvolved: peopleFor(code),
        ...located(where),
        status: random.chance(0.86) ? "SUCCEEDED" : "FAILED",
        priority: priorityFor(code),
        heroId: heroId.get(random.pick(approvedHeroKeys))!,
        interventionStartedAt: startedAt,
        interventionEndedAt: addMinutes(startedAt, random.int(18, 110)),
        createdAt: addMinutes(occurredAt, random.int(1, 3)),
      });
    }

    // Camille's latest incident: resolved yesterday and not rated yet.
    {
      const occurredAt = minutesAgo(60 * 22);
      const startedAt = addMinutes(occurredAt, 4);
      incidents.push({
        id: crypto.randomUUID(),
        reporterId: camille,
        typeId: typeByCode.get("THEFT")!.id,
        villainId: villains.find((villain) => villain.alias === "Le Rhino")!.id,
        reportedVillainName: "Le Rhino",
        description: "Un homme en armure a foncé dans la vitrine de la boulangerie et s'est enfui avec la caisse.",
        occurredAt,
        peopleInvolved: 3,
        ...located(place("République"), 0.002),
        status: "SUCCEEDED",
        priority: "NORMAL",
        heroId: heroId.get("spiderman")!,
        interventionStartedAt: startedAt,
        interventionEndedAt: addMinutes(startedAt, 26),
        createdAt: addMinutes(occurredAt, 1),
      });
    }

    // Each imprisoned villain was caught during their latest succeeded intervention.
    for (const villain of villains.filter((v) => v.imprisoned)) {
      const own = incidents
        .filter((incident) => incident.villainId === villain.id && incident.status === "SUCCEEDED")
        .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
      let capture = own[0];
      if (!capture) {
        capture = incidents.find((incident) => incident.status === "SUCCEEDED" && !incident.villainId)!;
        capture.villainId = villain.id;
      }
      // No crime after the arrest.
      for (const incident of incidents) {
        if (incident.villainId === villain.id && incident.occurredAt > capture.occurredAt) {
          incident.villainId = null;
        }
      }
      capture.villainImprisoned = true;
    }

    // Live incidents: just reported, waiting for a hero.
    const reported: { code: string; where: string; minutes: number; prioritized: boolean; reporter: string }[] = [
      { code: "HOSTAGE_TAKING", where: "Opéra", minutes: 4, prioritized: true, reporter: random.pick(activeReporters) },
      { code: "TERROR_ATTACK", where: "Bercy", minutes: 9, prioritized: true, reporter: random.pick(activeReporters) },
      { code: "THEFT", where: "Châtelet", minutes: 14, prioritized: false, reporter: random.pick(activeReporters) },
      { code: "BURGLARY", where: "Champs-Élysées", minutes: 26, prioritized: true, reporter: random.pick(activeReporters) },
      { code: "ATTEMPTED_KIDNAPPING", where: "Butte-aux-Cailles", minutes: 2, prioritized: false, reporter: random.pick(activeReporters) },
      { code: "OTHER", where: "Saint-Denis", minutes: 47, prioritized: true, reporter: random.pick(activeReporters) },
    ];
    for (const live of reported) {
      const occurredAt = minutesAgo(live.minutes + 1);
      const villain = villainFor(live.code, false);
      incidents.push({
        id: crypto.randomUUID(),
        reporterId: live.reporter,
        typeId: typeByCode.get(live.code)!.id,
        villainId: null,
        reportedVillainName: villain?.alias ?? null,
        description: describe(live.code),
        occurredAt,
        peopleInvolved: peopleFor(live.code),
        ...located(place(live.where), 0.003),
        status: "REPORTED",
        priority: live.prioritized ? priorityFor(live.code) : null,
        createdAt: minutesAgo(live.minutes),
      });
    }
    // A likely duplicate of the hostage taking (same place, a few minutes later).
    {
      const original = incidents[incidents.length - reported.length];
      incidents.push({
        ...original,
        id: crypto.randomUUID(),
        reporterId: lucas,
        description: "Des gens sont retenus dans la banque du boulevard, un homme armé bloque l'entrée !",
        latitude: original.latitude! + 0.0006,
        longitude: original.longitude! - 0.0004,
        peopleInvolved: 10,
        priority: null,
        createdAt: minutesAgo(2),
      });
    }

    // Live interventions (one per hero at most, enforced by the database).
    const ongoing: { hero: string; code: string; where: string; minutes: number; reporter: string }[] = [
      { hero: "widow", code: "KIDNAPPING", where: "République", minutes: 12, reporter: camille },
      { hero: "ironman", code: "TERROR_ATTACK", where: "La Défense", minutes: 21, reporter: random.pick(activeReporters) },
      { hero: "thor", code: "ATTEMPTED_MURDER", where: "Trocadéro", minutes: 8, reporter: random.pick(activeReporters) },
    ];
    for (const live of ongoing) {
      const occurredAt = minutesAgo(live.minutes + 6);
      const villain = villainFor(live.code, false);
      incidents.push({
        id: crypto.randomUUID(),
        reporterId: live.reporter,
        typeId: typeByCode.get(live.code)!.id,
        villainId: villain?.id ?? null,
        reportedVillainName: villain?.alias ?? null,
        description: describe(live.code),
        occurredAt,
        peopleInvolved: peopleFor(live.code),
        ...located(place(live.where), 0.003),
        status: "IN_PROGRESS",
        priority: "HIGH",
        heroId: heroId.get(live.hero)!,
        interventionStartedAt: minutesAgo(live.minutes),
        createdAt: addMinutes(occurredAt, 2),
      });
    }

    // A duplicate the moderators already removed.
    {
      const occurredAt = daysAgo(9);
      incidents.push({
        id: crypto.randomUUID(),
        reporterId: lucas,
        typeId: typeByCode.get("BURGLARY")!.id,
        description: "Cambriolage en cours dans la bijouterie, la vitrine est explosée.",
        occurredAt,
        peopleInvolved: 1,
        ...located(place("Bastille"), 0.001),
        status: "REPORTED",
        priority: "NORMAL",
        deletedAt: addMinutes(occurredAt, 25),
        deletedBy: moderator.id,
        createdAt: addMinutes(occurredAt, 1),
      });
    }

    await tx.insert(s.incidents).values(incidents);

    // Heroes stand where their last intervention ended.
    for (const live of ongoing) {
      const incident = incidents.find((i) => i.heroId === heroId.get(live.hero) && i.status === "IN_PROGRESS")!;
      await tx
        .update(s.heroProfiles)
        .set({ latitude: incident.latitude, longitude: incident.longitude, locationUpdatedAt: incident.interventionStartedAt })
        .where(eq(s.heroProfiles.userId, heroId.get(live.hero)!));
    }

    for (const villain of villains.filter((v) => v.imprisoned)) {
      const capture = incidents.find((incident) => incident.villainId === villain.id && incident.villainImprisoned)!;
      await tx
        .update(s.villains)
        .set({ status: "IMPRISONED", imprisonedAt: capture.interventionEndedAt })
        .where(eq(s.villains.id, villain.id));
    }

    // --- Reviews --------------------------------------------------------------
    const closed = incidents.filter(
      (incident) =>
        (incident.status === "SUCCEEDED" || incident.status === "FAILED") &&
        incident.interventionEndedAt! < minutesAgo(60 * 24),
    );
    const reviews: (typeof s.heroReviews.$inferInsert)[] = [];
    for (const incident of closed) {
      if (!random.chance(0.72)) continue;
      const pool =
        incident.status === "FAILED"
          ? REVIEW_COMMENTS.filter((review) => review.rating <= 3)
          : REVIEW_COMMENTS.filter((review) => review.rating >= 3);
      const review = random.pick(pool);
      const createdAt = addMinutes(incident.interventionEndedAt!, random.int(30, 60 * 30));
      const replied = review.comment !== null && random.chance(0.3);
      reviews.push({
        incidentId: incident.id,
        citizenId: incident.reporterId,
        heroId: incident.heroId!,
        rating: review.rating,
        comment: review.comment,
        heroReply: replied ? random.pick(HERO_REPLIES) : null,
        repliedAt: replied ? addMinutes(createdAt, random.int(60, 60 * 24)) : null,
        createdAt,
      });
    }
    // One abusive comment already hidden by the moderators.
    const hiddenTarget = reviews.find((review) => review.comment !== null);
    if (hiddenTarget) {
      hiddenTarget.rating = 1;
      hiddenTarget.comment = "Complètement nul, une honte, je vais tout raconter sur les réseaux !!!";
      hiddenTarget.heroReply = null;
      hiddenTarget.repliedAt = null;
      hiddenTarget.moderationStatus = "HIDDEN";
    }
    if (reviews.length > 0) await tx.insert(s.heroReviews).values(reviews);

    // --- Pending requests -------------------------------------------------------
    await tx.insert(s.emailChangeRequests).values({
      userId: lucas,
      newEmail: "lucas.b@nouveau-mail.test",
      createdAt: daysAgo(1),
    });

    // --- Blog & newsletter ------------------------------------------------------
    await tx.insert(s.articles).values(
      ARTICLES.map((article) => ({
        title: article.title,
        slug: article.slug,
        contentHtml: article.html,
        authorId: admin.id,
        status: article.daysAgo === null ? ("DRAFT" as const) : ("PUBLISHED" as const),
        publishedAt: article.daysAgo === null ? null : daysAgo(article.daysAgo),
        createdAt: daysAgo(article.daysAgo === null ? 1 : article.daysAgo + 1),
      })),
    );

    const subscriptions = await tx
      .insert(s.newsletterSubscriptions)
      .values([
        { email: "citoyen@heros-sos.test", userId: camille, subscribedAt: daysAgo(60) },
        { email: "lucas.bernard@heros-sos.test", userId: lucas, isEnabled: false, subscribedAt: daysAgo(50) },
        { email: "fan.de.marvel@exemple.test", subscribedAt: daysAgo(33) },
        { email: "jeanne.l@exemple.test", subscribedAt: daysAgo(21) },
        { email: "contact@quartier-bastille.test", subscribedAt: daysAgo(8) },
      ])
      .returning({ id: s.newsletterSubscriptions.id, isEnabled: s.newsletterSubscriptions.isEnabled, subscribedAt: s.newsletterSubscriptions.subscribedAt });
    const sentAt = daysAgo(12);
    const [newsletter] = await tx
      .insert(s.newsletters)
      .values({
        subject: "La lettre des héros — n°1",
        contentHtml:
          "<h2>Bienvenue dans la lettre des héros</h2><p>Chaque mois, retrouvez les statistiques des interventions, les vilains mis hors d'état de nuire et les conseils de nos super-héros.</p><p>Ce mois-ci : <strong>4 vilains</strong> sous les verrous !</p>",
        createdBy: moderator.id,
        createdAt: sentAt,
      })
      .returning({ id: s.newsletters.id });
    await tx.insert(s.newsletterSends).values(
      subscriptions
        .filter((subscription) => subscription.subscribedAt < sentAt)
        .map((subscription) => ({ newsletterId: newsletter.id, subscriptionId: subscription.id, sentAt })),
    );

    // --- Activity log -----------------------------------------------------------
    const logs: (typeof s.activityLogs.$inferInsert)[] = [];
    for (const incident of incidents) {
      logs.push({ actorId: incident.reporterId, action: "incident.create", entityType: "incident", entityId: incident.id, createdAt: incident.createdAt });
      if (incident.interventionStartedAt) {
        logs.push({ actorId: incident.heroId, action: "incident.take", entityType: "incident", entityId: incident.id, createdAt: incident.interventionStartedAt });
      }
      if (incident.interventionEndedAt) {
        logs.push({ actorId: incident.heroId, action: incident.status === "SUCCEEDED" ? "incident.succeed" : "incident.fail", entityType: "incident", entityId: incident.id, createdAt: incident.interventionEndedAt });
      }
      if (incident.deletedAt) {
        logs.push({ actorId: incident.deletedBy, action: "incident.delete", entityType: "incident", entityId: incident.id, metadata: { reason: "Doublon" }, createdAt: incident.deletedAt });
      }
    }
    for (const hero of HEROES.filter((h) => h.status === "PENDING")) {
      logs.push({ actorId: heroId.get(hero.key)!, action: "hero.apply", entityType: "user", entityId: heroId.get(hero.key)!, metadata: { alias: hero.alias }, createdAt: daysAgo(1) });
    }
    logs.push({ actorId: moderator.id, action: "user.disable", entityType: "user", entityId: citizenId.get("kevin")!, createdAt: daysAgo(20) });
    await tx.insert(s.activityLogs).values(logs);
  });
}
