import "server-only";
import { z } from "zod";
import { parse, readBody } from "@/lib/server/api";

/** Body of the approve / reject endpoints of the moderation queue. */
export async function readDecision(request: Request): Promise<boolean> {
  const schema = z.object({ approved: z.boolean({ error: "`approved` doit être un booléen." }) });
  return parse(schema, await readBody(request)).approved;
}
