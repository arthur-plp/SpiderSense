"use server";

import { eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { villains } from "@/db/schema";
import { type ActionState, formValues } from "@/lib/action-state";
import { requireStaff } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import {
  createVillainFromReport,
  deleteIncidentAsModerator,
  updateIncidentAsModerator,
} from "@/lib/server/services/admin/incidents";
import { createIncident, isUuid, listIncidentTypes, setIncidentPriority } from "@/lib/server/services/incidents";
import {
  fieldErrorsOf,
  incidentSchema,
  optionalNumber,
  optionalText,
  prioritySchema,
  requiredText,
} from "@/lib/validation";
import { invalidRequest, resultState } from "./shared";

const optionalPriority = z
  .union([z.literal(""), prioritySchema])
  .optional()
  .transform((value) => value || null);

async function isKnownType(typeId: number): Promise<boolean> {
  return (await listIncidentTypes()).some((type) => type.id === typeId);
}

/** Inline priority from the incident list (Haute / Normale / Basse). */
export async function setIncidentPriorityAction(incidentId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireStaff();
  if (!isUuid(incidentId)) return invalidRequest;
  const parsed = prioritySchema.safeParse(formData.get("priority"));
  if (!parsed.success) return { status: "error", message: "Choisissez une priorité." };
  const result = await setIncidentPriority(incidentId, parsed.data, actor.id);
  if (!result.ok) return { status: "error", message: result.error };
  // Triage only (heroes do the same): the reporter is emailed when the
  // incident itself is corrected or removed, not on every priority change.
  refresh();
  return { status: "success", message: "Priorité mise à jour." };
}

/** A moderator reports an incident like a citizen would, optionally prioritised. */
export async function createIncidentAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireStaff();
  const values = formValues(formData);
  const parsed = incidentSchema.safeParse(Object.fromEntries(formData));
  const priority = optionalPriority.safeParse(formData.get("priority") ?? "");
  if (!parsed.success || !priority.success) {
    return {
      status: "error",
      message: "Certains champs sont à corriger.",
      fieldErrors: {
        ...(parsed.success ? {} : fieldErrorsOf(parsed.error)),
        ...(priority.success ? {} : { priority: ["Priorité invalide."] }),
      },
      values,
    };
  }
  if (!(await isKnownType(parsed.data.typeId))) {
    return { status: "error", fieldErrors: { typeId: ["Choisissez un type d'incident."] }, values };
  }
  const id = await createIncident({ ...parsed.data, priority: priority.data }, actor.id);
  redirect(`/admin/incidents/${id}`);
}

const incidentEditSchema = z.object({
  typeId: z.coerce.number({ error: "Choisissez un type d'incident." }).int().positive("Choisissez un type d'incident."),
  description: z
    .string()
    .trim()
    .min(10, "La description doit faire au moins 10 caractères.")
    .max(2000, "2000 caractères maximum."),
  peopleInvolved: z.coerce.number().int().min(0, "Nombre invalide.").max(10_000, "Nombre invalide."),
  street: optionalText(),
  postalCode: optionalText(10),
  city: requiredText("La ville", 100),
  country: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((value) => value || "France"),
  latitude: optionalNumber(-90, 90),
  longitude: optionalNumber(-180, 180),
  reportedVillainName: optionalText(100),
  priority: optionalPriority,
  villainId: z
    .string()
    .optional()
    .transform((value) => value || null)
    .refine((value) => value === null || isUuid(value), "Vilain invalide."),
});

export async function updateIncidentAction(incidentId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireStaff();
  if (!isUuid(incidentId)) return invalidRequest;
  const values = formValues(formData);
  const parsed = incidentEditSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "Certains champs sont à corriger.", fieldErrors: fieldErrorsOf(parsed.error), values };
  }
  if (!(await isKnownType(parsed.data.typeId))) {
    return { status: "error", fieldErrors: { typeId: ["Choisissez un type d'incident."] }, values };
  }
  if (parsed.data.villainId) {
    const database = await db();
    const [villain] = await database.select({ id: villains.id }).from(villains).where(eq(villains.id, parsed.data.villainId));
    if (!villain) return { status: "error", fieldErrors: { villainId: ["Ce vilain n'existe plus."] }, values };
  }

  const result = await updateIncidentAsModerator(incidentId, parsed.data, actor.id);
  if (!result.ok) return { status: "error", message: result.error, values };
  refresh();
  if (!result.changed?.length) return { status: "success", message: "Aucune modification à enregistrer." };
  return {
    status: "success",
    message: `Incident mis à jour (${result.changed.join(", ")}). Le déclarant a été prévenu par email.`,
  };
}

const DELETE_REASONS: Record<string, string> = {
  DUPLICATE: "Doublon d'un incident déjà signalé",
  FALSE_REPORT: "Signalement erroné ou abusif",
  RESOLVED: "Situation déjà résolue",
  OTHER: "",
};

export async function deleteIncidentAction(incidentId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireStaff();
  if (!isUuid(incidentId)) return invalidRequest;
  const values = formValues(formData);
  const preset = String(formData.get("reason") ?? "");
  const details = String(formData.get("details") ?? "").trim().slice(0, 500);
  if (!(preset in DELETE_REASONS)) {
    return { status: "error", fieldErrors: { reason: ["Choisissez un motif."] }, values };
  }
  const reason = [DELETE_REASONS[preset], details].filter(Boolean).join(" — ");
  if (!reason) return { status: "error", fieldErrors: { details: ["Précisez le motif de la suppression."] }, values };

  const result = await deleteIncidentAsModerator(incidentId, reason, actor.id);
  if (!result.ok) return { status: "error", message: result.error };
  refresh();
  return { status: "success", message: "Incident supprimé. Le déclarant a été prévenu par email." };
}

export async function createVillainFromIncidentAction(incidentId: string): Promise<ActionState> {
  const actor = await requireStaff();
  if (!isUuid(incidentId)) return invalidRequest;
  const result = await createVillainFromReport(incidentId, actor.id);
  if (!result.ok) return { status: "error", message: result.error };
  refresh();
  return resultState(
    result,
    result.created
      ? "Vilain ajouté à l'encyclopédie et lié à l'incident. Complétez sa fiche."
      : "Ce vilain existait déjà dans l'encyclopédie : il a été lié à l'incident.",
  );
}
