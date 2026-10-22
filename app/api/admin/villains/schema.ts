import "server-only";
import { z } from "zod";
import { ApiError, fieldError, parse, readFormBody } from "@/lib/server/api";
import type { SaveVillainResult } from "@/lib/server/services/admin/villains";
import { listIncidentTypes } from "@/lib/server/services/incidents";
import { idListSchema, optionalHttpUrl, optionalText, requiredText } from "@/lib/validation";

const villainSchema = z.object({
  alias: requiredText("Le nom de vilain", 100),
  firstName: optionalText(100),
  lastName: optionalText(100),
  description: optionalText(4000),
  mainSector: optionalText(255),
  imageUrl: optionalHttpUrl,
  status: z.enum(["AT_LARGE", "IMPRISONED"], { error: "Statut invalide." }),
  imprisonedAt: z
    .string()
    .optional()
    .transform((value, context) => {
      if (!value) return null;
      // Date only (no time zone question): stored at noon UTC so it shows the same day in Paris.
      const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00Z`) : null;
      if (!date || Number.isNaN(date.getTime()) || date.getTime() > Date.now() + 24 * 3600 * 1000) {
        context.addIssue({ code: "custom", message: "Date d'emprisonnement invalide." });
        return z.NEVER;
      }
      return date;
    }),
  specialties: idListSchema,
});

/** Villain fields of a create / update request; unknown incident types are dropped from the specialties. */
export async function readVillain(request: Request) {
  const { specialties, ...input } = parse(villainSchema, await readFormBody(request));
  const knownTypes = new Set((await listIncidentTypes()).map((type) => type.id));
  return { ...input, specialtyIds: specialties.filter((id) => knownTypes.has(id)) };
}

/** Throws the error of a failed save, on its field when the service names one. */
export function checkSaved(result: SaveVillainResult): asserts result is Extract<SaveVillainResult, { ok: true }> {
  if (result.ok) return;
  throw result.field ? fieldError(result.field, result.error, 409) : new ApiError(400, result.error);
}
