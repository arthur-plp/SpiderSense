// State of a form that calls the API (useApiForm), consumed with useActionState.
export type ActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  /** Submitted values, so forms keep their content after an error. */
  values?: Record<string, string>;
};

export const idleState: ActionState = { status: "idle" };
