import { eq } from "drizzle-orm";
import { z } from "zod";
import { villains } from "@/db/schema";
import { apiStaff, apiUser, check, fieldError, notFound, parse, readFormBody, route, uuidParam } from "@/lib/server/api";
import { db } from "@/lib/server/db";
import { deleteIncidentAsModerator, updateIncidentAsModerator } from "@/lib/server/services/admin/incidents";
import { getIncident, isUuid, listIncidentTypes } from "@/lib/server/services/incidents";
import { optionalNumber, optionalText, prioritySchema, requiredText } from "@/lib/validation";

type Context = RouteContext<"/api/incidents/[id]">;

/** GET /api/incidents/:id — one incident. */
export const GET = route(async (_request, { params }: Context) => {
  const user = await apiUser();
  const incident = await getIncident(uuidParam((await params).id));
  if (!incident || (incident.deletedAt && !user.isStaff)) throw notFound("Incident introuvable.");
  const board = user.isHero || user.isStaff;
  return Response.json({
    incident: board || incident.reporterId === user.id ? incident : { ...incident, reporterId: null },
  });
});

const editSchema = z.object({
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
  priority: z
    .union([z.literal(""), prioritySchema])
    .optional()
    .transform((value) => value || null),
  villainId: z
    .string()
    .optional()
    .transform((value) => value || null)
    .refine((value) => value === null || isUuid(value), "Vilain invalide."),
});

/** PUT /api/incidents/:id — a moderator corrects the incident (every field is replaced). The reporter is emailed. */
export const PUT = route(async (request, { params }: Context) => {
  const actor = await apiStaff();
  const id = uuidParam((await params).id);
  const input = parse(editSchema, await readFormBody(request));
  if (!(await listIncidentTypes()).some((type) => type.id === input.typeId)) {
    throw fieldError("typeId", "Choisissez un type d'incident.");
  }
  if (input.villainId) {
    const database = await db();
    const [villain] = await database.select({ id: villains.id }).from(villains).where(eq(villains.id, input.villainId));
    if (!villain) throw fieldError("villainId", "Ce vilain n'existe plus.");
  }
  const result = await updateIncidentAsModerator(id, input, actor.id);
  check(result);
  const changed = result.changed ?? [];
  return Response.json({
    message: changed.length
      ? `Incident mis à jour (${changed.join(", ")}). Le déclarant a été prévenu par email.`
      : "Aucune modification à enregistrer.",
    changed,
  });
});

const DELETE_REASONS = {
  DUPLICATE: "Doublon d'un incident déjà signalé",
  FALSE_REPORT: "Signalement erroné ou abusif",
  RESOLVED: "Situation déjà résolue",
  OTHER: "",
} as const;

const deleteSchema = z.object({
  reason: z.enum(Object.keys(DELETE_REASONS) as [keyof typeof DELETE_REASONS], { error: "Choisissez un motif." }),
  details: z
    .string()
    .optional()
    .transform((value) => (value ?? "").trim().slice(0, 500)),
});

/** DELETE /api/incidents/:id — soft delete by a moderator, with a reason emailed to the reporter. */
export const DELETE = route(async (request, { params }: Context) => {
  const actor = await apiStaff();
  const id = uuidParam((await params).id);
  const { reason, details } = parse(deleteSchema, await readFormBody(request));
  const text = [DELETE_REASONS[reason], details].filter(Boolean).join(" — ");
  if (!text) throw fieldError("details", "Précisez le motif de la suppression.");
  check(await deleteIncidentAsModerator(id, text, actor.id));
  return Response.json({ message: "Incident supprimé. Le déclarant a été prévenu par email." });
});
