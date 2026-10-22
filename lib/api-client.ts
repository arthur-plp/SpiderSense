// Browser side of the REST API (app/api/): a typed fetch, and the description
// of an endpoint that server components can pass to client forms and buttons.

import type { ActionState } from "./action-state";

export type ApiMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type FieldErrors = Record<string, string[] | undefined>;

export type ApiResult<T = Record<string, unknown>> =
  | { ok: true; status: number; data: T & { message?: string } }
  | { ok: false; status: number; error: string; fieldErrors?: FieldErrors; data: Record<string, unknown> };

/**
 * A call that a form or a button makes. Serializable, so a server component
 * can build it (`{ method: "POST", path: `/api/incidents/${id}/villain` }`).
 */
export type ApiEndpoint = {
  method: Exclude<ApiMethod, "GET">;
  path: string;
  /** Fixed fields, merged with the form fields. */
  body?: Record<string, unknown>;
  /** Shown when the API answers without a message. */
  successMessage?: string;
  /** Page to open after a success; `{field}` is replaced by that response field. */
  redirectTo?: string;
  /** Full page load after a success (sign-in / sign-out change every layout). */
  fullReload?: boolean;
};

/** Calls the API with a JSON (or multipart, for files) body. Never throws. */
export async function apiRequest<T = Record<string, unknown>>(
  method: ApiMethod,
  path: string,
  body?: Record<string, unknown> | FormData,
): Promise<ApiResult<T>> {
  let response: Response;
  try {
    response = await fetch(path, {
      method,
      credentials: "same-origin",
      headers: body && !(body instanceof FormData) ? { "content-type": "application/json" } : undefined,
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    });
  } catch {
    return { ok: false, status: 0, error: "Connexion impossible. Vérifiez votre réseau et réessayez.", data: {} };
  }
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (response.ok) return { ok: true, status: response.status, data: data as T & { message?: string } };
  return {
    ok: false,
    status: response.status,
    error: typeof data.error === "string" ? data.error : "Une erreur inattendue est survenue.",
    fieldErrors: data.fieldErrors as FieldErrors | undefined,
    data,
  };
}

/** Form fields as a JSON object: repeated names (checkbox groups) become arrays. */
export function formDataToBody(formData: FormData): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  for (const key of new Set(formData.keys())) {
    if (key.startsWith("$ACTION")) continue;
    const values = formData.getAll(key).filter((value): value is string => typeof value === "string");
    if (values.length > 0) body[key] = values.length > 1 ? values : values[0];
  }
  return body;
}

const hasFile = (formData: FormData) => [...formData.values()].some((value) => value instanceof File && value.size > 0);

/** Fields kept in the form after an error, never the passwords. */
function keptValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of Object.entries(formDataToBody(formData))) {
    if (/password/i.test(key)) continue;
    values[key] = Array.isArray(value) ? value.join(",") : String(value);
  }
  return values;
}

const pick = (data: Record<string, unknown>, path: string): unknown =>
  path.split(".").reduce<unknown>((value, key) => (value as Record<string, unknown> | undefined)?.[key], data);

/** Fills `{field}` / `{user.email}` placeholders with the response data ("{homePath}" alone is taken as is). */
export function fillPath(template: string, data: Record<string, unknown>): string {
  const whole = /^\{([\w.]+)\}$/.exec(template);
  if (whole) return String(pick(data, whole[1]) ?? "/");
  return template.replace(/\{([\w.]+)\}/g, (_, path: string) => encodeURIComponent(String(pick(data, path) ?? "")));
}

/** Runs an endpoint with the submitted form, as the state of a useActionState form. */
export async function submitEndpoint(
  endpoint: ApiEndpoint,
  formData?: FormData,
): Promise<{ state: ActionState; result: ApiResult }> {
  const body =
    formData && hasFile(formData)
      ? (() => {
          const multipart = new FormData();
          for (const [key, value] of formData.entries()) if (!key.startsWith("$ACTION")) multipart.append(key, value);
          for (const [key, value] of Object.entries(endpoint.body ?? {})) multipart.set(key, String(value));
          return multipart;
        })()
      : { ...(formData ? formDataToBody(formData) : {}), ...endpoint.body };
  const result = await apiRequest(endpoint.method, endpoint.path, body);
  if (result.ok) {
    return { result, state: { status: "success", message: result.data.message ?? endpoint.successMessage } };
  }
  const extraValues = Object.fromEntries(
    Object.entries(result.data).filter(([key, value]) => !["error", "fieldErrors"].includes(key) && typeof value === "string"),
  ) as Record<string, string>;
  // A single-field error is already shown next to its field: not twice.
  const repeatsAField = Object.values(result.fieldErrors ?? {}).some((messages) => messages?.includes(result.error));
  return {
    result,
    state: {
      status: "error",
      message: repeatsAField ? undefined : result.error,
      fieldErrors: result.fieldErrors,
      values: { ...(formData ? keptValues(formData) : {}), ...extraValues },
    },
  };
}

export const LOGOUT_ENDPOINT: ApiEndpoint = { method: "POST", path: "/api/auth/logout", redirectTo: "/", fullReload: true };
