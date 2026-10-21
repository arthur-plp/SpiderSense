import "server-only";
import { and, eq, isNull, sql } from "drizzle-orm";
import { incidentTypes, incidents, villainSpecialties, villains } from "@/db/schema";
import { db } from "../db";

export type VillainDto = {
  id: string;
  alias: string;
  firstName: string | null;
  lastName: string | null;
  description: string | null;
  mainSector: string | null;
  imageUrl: string | null;
  status: "AT_LARGE" | "IMPRISONED";
  imprisonedAt: string | null;
  specialties: { id: number; code: string; label: string }[];
  incidentsCount: number;
  createdAt: string;
};

export async function listVillains(villainId?: string): Promise<VillainDto[]> {
  const database = await db();
  const [rows, specialties, counts] = await Promise.all([
    database
      .select()
      .from(villains)
      .where(villainId ? eq(villains.id, villainId) : undefined)
      .orderBy(villains.alias),
    database
      .select({
        villainId: villainSpecialties.villainId,
        id: incidentTypes.id,
        code: incidentTypes.code,
        label: incidentTypes.label,
      })
      .from(villainSpecialties)
      .innerJoin(incidentTypes, eq(villainSpecialties.incidentTypeId, incidentTypes.id))
      .where(villainId ? eq(villainSpecialties.villainId, villainId) : undefined),
    database
      .select({ villainId: incidents.villainId, count: sql<number>`count(*)::int` })
      .from(incidents)
      .where(and(isNull(incidents.deletedAt), villainId ? eq(incidents.villainId, villainId) : undefined))
      .groupBy(incidents.villainId),
  ]);
  const countOf = new Map(counts.map((row) => [row.villainId, row.count]));
  return rows.map((villain) => ({
    id: villain.id,
    alias: villain.alias,
    firstName: villain.firstName,
    lastName: villain.lastName,
    description: villain.description,
    mainSector: villain.mainSector,
    imageUrl: villain.imageUrl,
    status: villain.status,
    imprisonedAt: villain.imprisonedAt?.toISOString() ?? null,
    specialties: specialties
      .filter((specialty) => specialty.villainId === villain.id)
      .map(({ id, code, label }) => ({ id, code, label })),
    incidentsCount: countOf.get(villain.id) ?? 0,
    createdAt: villain.createdAt.toISOString(),
  }));
}

export async function getVillain(villainId: string): Promise<VillainDto | null> {
  if (!/^[0-9a-f-]{36}$/i.test(villainId)) return null;
  const [villain] = await listVillains(villainId);
  return villain ?? null;
}

/** Lightweight list for selects (linking an incident to a villain). */
export async function listVillainOptions() {
  const database = await db();
  return database
    .select({ id: villains.id, alias: villains.alias, status: villains.status })
    .from(villains)
    .orderBy(villains.alias);
}
