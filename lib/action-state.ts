// Shape returned by every form Server Action, consumed with useActionState.
export type ActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  /** Submitted values, so forms keep their content after an error. */
  values?: Record<string, string>;
};

export const idleState: ActionState = { status: "idle" };

export function formValues(formData: FormData, omit: string[] = []): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && !omit.includes(key) && !key.startsWith("$ACTION")) {
      values[key] = value;
    }
  }
  return values;
}
