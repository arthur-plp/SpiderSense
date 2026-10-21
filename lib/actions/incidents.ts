"use server";

import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { heroProfiles, incidents, users } from "@/db/schema";
import { type ActionState, formValues } from "@/lib/action-state";
import { distanceInMeters, DUPLICATE_RADIUS_METERS } from "@/lib/geo";
import type { IncidentPriority } from "@/lib/labels";
import { requireHero, requireUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { setHeroLocation, setHeroOnDuty } from "@/lib/server/services/heroes";
import {
  closeIntervention,
  createIncident,
  getIncident,
  type IncidentDto,
  listActiveIncidents,
  type MutationResult,
  setIncidentPriority,
  takeIncident,
} from "@/lib/server/services/incidents";
import { createReview } from "@/lib/server/services/reviews";
import { fieldErrorsOf, incidentSchema, optionalText, prioritySchema } from "@/lib/validation";
import { z } from "zod";

// --- Citizens -------------------------------------------------------------------

/** Detailed declaration form (6.1.2). */
export async function declareIncident(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = incidentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "Certains champs sont à corriger.", fieldErrors: fieldErrorsOf(parsed.error), values: formValues(formData) };
  }
  const id = await createIncident(parsed.data, user.id);
  redirect(`/citoyen/incidents/${id}?nouveau=1`);
}

export type SosResult =
  | { ok: true; incidentId: string; heroesAvailable: number }
  | { ok: false; error: string; fieldErrors?: Record<string, string[] | undefined> };

/** Buzzer alert: same validation as the form, answered in place (no redirect). */
export async function sendSosAlert(formData: FormData): Promise<SosResult> {
  const user = await requireUser();
  const parsed = incidentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: "Alerte incomplète : vérifiez le type et le lieu.", fieldErrors: fieldErrorsOf(parsed.error) };
  }
  const incidentId = await createIncident(parsed.data, user.id);
  const database = await db();
  const [{ count }] = await database
    .select({ count: sql<number>`count(*)::int` })
    .from(heroProfiles)
    .innerJoin(users, eq(users.id, heroProfiles.userId))
    .where(and(eq(heroProfiles.status, "APPROVED"), eq(heroProfiles.onDuty, true), isNull(users.disabledAt)));
  refresh();
  return { ok: true, incidentId, heroesAvailable: count };
}

/** Active incidents near a position, to warn about duplicates before sending. */
export async function findNearbyActiveIncidents(lat: number, lng: number): Promise<(IncidentDto & { distance: number })[]> {
  await requireUser();
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];
  const active = await listActiveIncidents();
  return active
    .filter((incident) => incident.latitude !== null && incident.longitude !== null)
    .map((incident) => ({
      ...incident,
      reporterId: null,
      distance: distanceInMeters({ lat, lng }, { lat: incident.latitude!, lng: incident.longitude! }),
    }))
    .filter((incident) => incident.distance <= DUPLICATE_RADIUS_METERS)
    .sort((a, b) => a.distance - b.distance);
}

const reviewSchema = z.object({
  rating: z.coerce.number({ error: "Choisissez une note." }).int().min(1, "Choisissez une note.").max(5),
  comment: optionalText(1000),
});

/** 6.1.3: satisfaction form after an intervention. */
export async function rateIntervention(incidentId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = reviewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsOf(parsed.error), values: formValues(formData) };
  }
  const result = await createReview(user.id, incidentId, parsed.data.rating, parsed.data.comment);
  if (!result.ok) return { status: "error", message: result.error };
  refresh();
  return { status: "success", message: "Merci ! Votre avis a été transmis au super-héros." };
}

// --- Heroes ---------------------------------------------------------------------

export async function takeIncidentAction(incidentId: string): Promise<MutationResult> {
  const hero = await requireHero();
  return takeIncident(incidentId, hero.id);
}

/** Heroes and moderators are the only ones who can prioritise (4.1.1). */
export async function setPriorityAction(incidentId: string, priority: IncidentPriority): Promise<MutationResult> {
  const user = await requireUser(["HERO", "MODERATOR", "ADMIN"]);
  if (user.role === "HERO" && !user.isHero) return { ok: false, error: "Accès réservé aux super-héros vérifiés." };
  const parsed = prioritySchema.safeParse(priority);
  if (!parsed.success) return { ok: false, error: "Priorité invalide." };
  return setIncidentPriority(incidentId, parsed.data, user.id);
}

const interventionSchema = z.object({
  outcome: z.enum(["SUCCEEDED", "FAILED"]),
  villainId: z.uuid().nullable(),
  villainImprisoned: z.boolean(),
  peopleInvolved: z.number().int().min(0).max(10_000),
});

export async function closeInterventionAction(
  incidentId: string,
  report: z.input<typeof interventionSchema>,
): Promise<MutationResult> {
  const hero = await requireHero();
  const parsed = interventionSchema.safeParse(report);
  if (!parsed.success) return { ok: false, error: "Rapport d'intervention invalide." };
  return closeIntervention(incidentId, hero.id, parsed.data);
}

/** Reporter contact, only for the hero in charge of the incident. */
export async function getReporterContact(incidentId: string): Promise<{ firstName: string; phone: string } | null> {
  const hero = await requireHero();
  const database = await db();
  const [row] = await database
    .select({ firstName: users.firstName, phone: users.phone })
    .from(incidents)
    .innerJoin(users, eq(incidents.reporterId, users.id))
    .where(and(eq(incidents.id, incidentId), eq(incidents.heroId, hero.id), inArray(incidents.status, ["IN_PROGRESS"])));
  return row ?? null;
}

export async function setOnDutyAction(onDuty: boolean): Promise<void> {
  const hero = await requireHero();
  await setHeroOnDuty(hero.id, onDuty);
  refresh();
}

export async function updateHeroLocationAction(lat: number, lng: number): Promise<MutationResult> {
  const hero = await requireHero();
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return { ok: false, error: "Position invalide." };
  }
  await setHeroLocation(hero.id, lat, lng);
  return { ok: true };
}

export async function getIncidentAction(incidentId: string): Promise<IncidentDto | null> {
  await requireUser();
  return getIncident(incidentId);
}
