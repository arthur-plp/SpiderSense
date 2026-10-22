import "server-only";
import { connection } from "next/server";
import type { z } from "zod";
import type { Role } from "@/lib/labels";
import { fieldErrorsOf } from "@/lib/validation";
import { type CurrentUser, getCurrentUser } from "./auth";
import { isUuid } from "./services/incidents";

// Building blocks of the route handlers in app/api/. Every route answers JSON:
// `{ message?, ...data }` on success, `{ error, fieldErrors? }` on failure.

export type FieldErrors = Record<string, string[] | undefined>;

/** Thrown inside a route to answer with an error status. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly fieldErrors?: FieldErrors,
    readonly extra?: Record<string, unknown>,
  ) {
    super(message);
  }
}

export const badRequest = (message = "Requête invalide.") => new ApiError(400, message);
export const notFound = (message = "Ressource introuvable.") => new ApiError(404, message);
export const fieldError = (field: string, message: string, status = 400) =>
  new ApiError(status, message, { [field]: [message] });

/** 400 with one message per field, from a zod error. */
export const validationError = (error: z.ZodError, message = "Certains champs sont à corriger.") =>
  new ApiError(400, message, fieldErrorsOf(error));

/** Throws the error of a failed service result (400 by default). */
export function check<T extends { ok: boolean; error?: string }>(
  result: T,
  status = 400,
): asserts result is T & { ok: true } {
  if (!result.ok) throw new ApiError(status, result.error ?? "Action impossible.");
}

export const noContent = () => new Response(null, { status: 204 });

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Browsers send Origin on cross-site requests: a mutation coming from another
 * site is refused (CSRF), on top of the SameSite=Lax session cookie.
 */
function isCrossSite(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin || !UNSAFE_METHODS.has(request.method)) return false;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return new URL(origin).host !== host;
  } catch {
    return true;
  }
}

/** Wraps a route handler: CSRF check, ApiError → JSON, anything else → 500. */
export function route<Context>(handler: (request: Request, context: Context) => Promise<Response>) {
  return async (request: Request, context: Context): Promise<Response> => {
    await connection();
    if (isCrossSite(request)) return Response.json({ error: "Origine non autorisée." }, { status: 403 });
    try {
      return await handler(request, context);
    } catch (error) {
      if (error instanceof ApiError) {
        return Response.json(
          { error: error.message, ...(error.fieldErrors && { fieldErrors: error.fieldErrors }), ...error.extra },
          { status: error.status },
        );
      }
      // redirect() / notFound() from shared helpers must keep working.
      if (error instanceof Error && "digest" in error) throw error;
      console.error(`[api] ${request.method} ${new URL(request.url).pathname}`, error);
      return Response.json({ error: "Une erreur inattendue est survenue." }, { status: 500 });
    }
  };
}

// --- Request body ---------------------------------------------------------------------

/** JSON object, or form fields (repeated keys become arrays, files are kept). */
export async function readBody(request: Request): Promise<Record<string, unknown>> {
  const type = request.headers.get("content-type") ?? "";
  if (type.includes("multipart/form-data") || type.includes("application/x-www-form-urlencoded")) {
    const form = await request.formData().catch(() => {
      throw badRequest("Corps de requête illisible.");
    });
    const body: Record<string, unknown> = {};
    for (const key of new Set(form.keys())) {
      const values = form.getAll(key);
      body[key] = values.length > 1 ? values : values[0];
    }
    return body;
  }
  const text = await request.text();
  if (!text.trim()) return {};
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    throw badRequest("Le corps de la requête n'est pas du JSON valide.");
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw badRequest("Le corps de la requête doit être un objet JSON.");
  }
  return body as Record<string, unknown>;
}

/**
 * Body of a form-like route, as the form schemas expect it: scalars become
 * strings (so `"typeId": 3` and `"typeId": "3"` are both accepted), null drops
 * the field, arrays are kept for repeated fields.
 */
export async function readFormBody(request: Request): Promise<Record<string, unknown>> {
  const body = await readBody(request);
  const fields: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (value === null || value === undefined) continue;
    if (Array.isArray(value)) fields[key] = value.map(String);
    else if (typeof value === "number" || typeof value === "boolean") fields[key] = String(value);
    else fields[key] = value;
  }
  return fields;
}

/** Parses an input with a schema, or throws a 400 with the field errors. */
export function parse<S extends z.ZodType>(schema: S, input: unknown, message?: string): z.output<S> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw validationError(parsed.error, message);
  return parsed.data;
}

/** Route parameter that must be a UUID, or 404. */
export function uuidParam(value: string): string {
  if (!isUuid(value)) throw notFound();
  return value;
}

// --- Access control ---------------------------------------------------------------------

/** Signed-in user (with one of `roles` if given), or 401 / 403. */
export async function apiUser(roles?: Role[]): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new ApiError(401, "Non authentifié");
  if (roles && !roles.includes(user.role)) throw new ApiError(403, "Accès réservé");
  return user;
}

/** Hero role with an approved profile, or 401 / 403. */
export async function apiHero(): Promise<CurrentUser> {
  const user = await apiUser();
  if (!user.isHero) throw new ApiError(403, "Accès réservé aux super-héros vérifiés.");
  return user;
}

/** Moderator or administrator, or 401 / 403. */
export const apiStaff = () => apiUser(["MODERATOR", "ADMIN"]);
