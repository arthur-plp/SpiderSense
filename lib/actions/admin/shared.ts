import "server-only";
import type { ActionState } from "@/lib/action-state";
import { optionalText } from "@/lib/validation";

export const invalidRequest: ActionState = { status: "error", message: "Requête invalide." };

/** Turns a service result into the state shown next to the button or form. */
export function resultState(result: { ok: true } | { ok: false; error: string }, success: string): ActionState {
  return result.ok ? { status: "success", message: success } : { status: "error", message: result.error };
}

const isHttpUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

/** Optional image / cover URL: only http(s), so no javascript: or data: payloads. */
export const optionalHttpUrl = optionalText(2000).refine(
  (value) => value === null || isHttpUrl(value),
  "Adresse web invalide (elle doit commencer par http:// ou https://).",
);

/** Form checkbox groups post one entry per checked box. */
export function checkedIds(formData: FormData, name: string): number[] {
  return [...new Set(formData.getAll(name).map(Number).filter((id) => Number.isInteger(id) && id > 0))];
}
