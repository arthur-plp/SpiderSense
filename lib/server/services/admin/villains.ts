import "server-only";
import { eq } from "drizzle-orm";
import { villainSpecialties, villains } from "@/db/schema";
import { logActivity } from "../../activity";
import { db, isUniqueViolation } from "../../db";
import type { MutationResult } from "../incidents";

export type VillainInput = {
  alias: string;
  firstName: string | null;
  lastName: string | null;
  description: string | null;
  mainSector: string | null;
  imageUrl: string | null;
  status: "AT_LARGE" | "IMPRISONED";
  imprisonedAt: Date | null;
  specialtyIds: number[];
};

export type SaveVillainResult = { ok: true; id: string } | { ok: false; error: string; field?: "alias" };

/** Creates (id null) or updates a villain and replaces its specialties. */
export async function saveVillain(id: string | null, input: VillainInput, actorId: string): Promise<SaveVillainResult> {
  const database = await db();
  const { specialtyIds, ...fields } = input;
  const values = {
    ...fields,
    // A villain at large has no imprisonment date; an arrest without date is dated now.
    imprisonedAt: fields.status === "IMPRISONED" ? (fields.imprisonedAt ?? new Date()) : null,
  };
  let savedId: string | null;
  try {
    savedId = await database.transaction(async (tx) => {
      let villainId = id;
      if (villainId) {
        const [row] = await tx.update(villains).set(values).where(eq(villains.id, villainId)).returning({ id: villains.id });
        if (!row) return null;
        await tx.delete(villainSpecialties).where(eq(villainSpecialties.villainId, villainId));
      } else {
        const [row] = await tx.insert(villains).values({ ...values, createdBy: actorId }).returning({ id: villains.id });
        villainId = row.id;
      }
      if (specialtyIds.length > 0) {
        await tx.insert(villainSpecialties).values(specialtyIds.map((incidentTypeId) => ({ villainId: villainId!, incidentTypeId })));
      }
      return villainId;
    });
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false, error: "Un vilain porte déjà ce nom.", field: "alias" };
    throw error;
  }
  if (!savedId) return { ok: false, error: "Ce vilain n'existe plus." };
  await logActivity({
    actorId,
    action: id ? "villain.update" : "villain.create",
    entityType: "villain",
    entityId: savedId,
    metadata: { alias: input.alias },
  });
  return { ok: true, id: savedId };
}

/** Linked incidents keep existing: their villain_id is set to null by the database. */
export async function deleteVillain(id: string, actorId: string): Promise<MutationResult> {
  const database = await db();
  const [row] = await database.delete(villains).where(eq(villains.id, id)).returning({ alias: villains.alias });
  if (!row) return { ok: false, error: "Ce vilain a déjà été supprimé." };
  await logActivity({ actorId, action: "villain.delete", entityType: "villain", entityId: id, metadata: { alias: row.alias } });
  return { ok: true };
}
