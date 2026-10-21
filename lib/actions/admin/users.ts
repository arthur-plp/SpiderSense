"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import type { ActionState } from "@/lib/action-state";
import { requireStaff, requireUser } from "@/lib/server/auth";
import { changeUserRole, setUserDisabled, verifyUser } from "@/lib/server/services/admin/users";
import { isUuid } from "@/lib/server/services/incidents";
import { invalidRequest, resultState } from "./shared";

export async function verifyUserAction(userId: string): Promise<ActionState> {
  const actor = await requireStaff();
  if (!isUuid(userId)) return invalidRequest;
  const result = await verifyUser(userId, actor);
  if (result.ok) refresh();
  return resultState(result, "Le compte porte désormais le badge « Citoyen vérifié ».");
}

export async function setUserDisabledAction(userId: string, disabled: boolean): Promise<ActionState> {
  const actor = await requireStaff();
  if (!isUuid(userId)) return invalidRequest;
  const result = await setUserDisabled(userId, disabled === true, actor);
  if (result.ok) refresh();
  return resultState(
    result,
    disabled ? "Compte désactivé : l'utilisateur a été déconnecté de tous ses appareils." : "Compte réactivé.",
  );
}

const roleSchema = z.enum(["CITIZEN", "HERO", "MODERATOR", "ADMIN"], { error: "Rôle invalide." });

/** Promotion / demotion: administrators only, never on their own account. */
export async function changeUserRoleAction(userId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireUser(["ADMIN"]);
  if (!isUuid(userId)) return invalidRequest;
  const parsed = roleSchema.safeParse(formData.get("role"));
  if (!parsed.success) return { status: "error", message: "Rôle invalide." };
  const result = await changeUserRole(userId, parsed.data, actor);
  if (result.ok) refresh();
  return resultState(result, "Rôle mis à jour.");
}
