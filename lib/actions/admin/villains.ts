"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { type ActionState, formValues } from "@/lib/action-state";
import { requireStaff } from "@/lib/server/auth";
import { deleteVillain, saveVillain } from "@/lib/server/services/admin/villains";
import { isUuid, listIncidentTypes } from "@/lib/server/services/incidents";
import { fieldErrorsOf, optionalText, requiredText } from "@/lib/validation";
import { checkedIds, invalidRequest, optionalHttpUrl } from "./shared";

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
});

/** Creates (villainId null) or updates an encyclopedia entry. */
export async function saveVillainAction(villainId: string | null, _: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireStaff();
  if (villainId !== null && !isUuid(villainId)) return invalidRequest;
  const values = { ...formValues(formData, ["specialties"]), specialties: formData.getAll("specialties").join(",") };
  const parsed = villainSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "Certains champs sont à corriger.", fieldErrors: fieldErrorsOf(parsed.error), values };
  }
  const knownTypes = new Set((await listIncidentTypes()).map((type) => type.id));
  const specialtyIds = checkedIds(formData, "specialties").filter((id) => knownTypes.has(id));

  const result = await saveVillain(villainId, { ...parsed.data, specialtyIds }, actor.id);
  if (!result.ok) {
    return result.field
      ? { status: "error", fieldErrors: { [result.field]: [result.error] }, values }
      : { status: "error", message: result.error, values };
  }
  if (!villainId) redirect(`/admin/vilains/${result.id}`);
  refresh();
  return { status: "success", message: "Fiche du vilain enregistrée." };
}

export async function deleteVillainAction(villainId: string): Promise<ActionState> {
  const actor = await requireStaff();
  if (!isUuid(villainId)) return invalidRequest;
  const result = await deleteVillain(villainId, actor.id);
  if (!result.ok) return { status: "error", message: result.error };
  redirect("/admin/vilains");
}
