import "server-only";
import { randomUUID } from "node:crypto";
import { eq, lt } from "drizzle-orm";
import { connection } from "next/server";
import type { z } from "zod";
import { getDb } from "@/db";
import { idempotencyKeys } from "@/db/schema";
import type { Role } from "@/lib/labels";
import { fieldErrorsOf } from "@/lib/validation";
import { type CurrentUser, getCurrentUser } from "./auth";
import { log } from "./logger";
import { parseClientTime, type RequestContext, requestContext, runWithContext } from "./request-context";
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

/** Wraps a route handler: CSRF check, idempotent replays, ApiError → JSON, anything else → 500, logs. */
export function route<Context>(handler: (request: Request, context: Context) => Promise<Response>) {
  return async (request: Request, context: Context): Promise<Response> => {
    await connection();
    const started = performance.now();
    const key = request.headers.get("idempotency-key");
    const requestContext: RequestContext = {
      requestId: request.headers.get("x-request-id") ?? randomUUID(),
      idempotencyKey: key && isUuid(key) ? key : null,
      offline: request.headers.get("x-offline-replay") === "1",
      clientTime: parseClientTime(request.headers.get("x-client-time")),
      events: [],
    };
    const response = await runWithContext(requestContext, () => handle(request, context, handler, requestContext));
    report(request, response, requestContext, performance.now() - started);
    return response;
  };
}

async function handle<Context>(
  request: Request,
  context: Context,
  handler: (request: Request, context: Context) => Promise<Response>,
  requestContext: RequestContext,
): Promise<Response> {
  if (isCrossSite(request)) return Response.json({ error: "Origine non autorisée." }, { status: 403 });
  const key = UNSAFE_METHODS.has(request.method) ? requestContext.idempotencyKey : null;
  if (key) {
    const replay = await claimIdempotencyKey(request, key);
    if (replay) return replay;
  }
  let response: Response;
  try {
    response = await handler(request, context);
  } catch (error) {
    // redirect() / notFound() from shared helpers must keep working.
    if (error instanceof Error && "digest" in error && !(error instanceof ApiError)) throw error;
    response = errorResponse(request, error);
  }
  // A crash may be temporary: the device will retry with the same key.
  if (key) await (response.status >= 500 ? releaseIdempotencyKey(key) : rememberResponse(key, response));
  return response;
}

function errorResponse(request: Request, error: unknown): Response {
  if (error instanceof ApiError) {
    return Response.json(
      { error: error.message, ...(error.fieldErrors && { fieldErrors: error.fieldErrors }), ...error.extra },
      { status: error.status },
    );
  }
  const path = new URL(request.url).pathname;
  console.error(`[api] ${request.method} ${path}`, error);
  log({
    level: "error",
    dataset: "app.error",
    message: error instanceof Error ? error.message : String(error),
    "http.request.method": request.method,
    "url.path": routePattern(path),
    "error.type": error instanceof Error ? error.name : typeof error,
    "error.stack_trace": error instanceof Error ? error.stack : undefined,
  });
  return Response.json({ error: "Une erreur inattendue est survenue." }, { status: 500 });
}

// --- Idempotency: an action queued offline is applied once, whatever the retries ----------

/** Null the first time a key is seen; otherwise the stored answer (or 409 while it runs). */
async function claimIdempotencyKey(request: Request, key: string): Promise<Response | null> {
  const user = await getCurrentUser();
  const path = new URL(request.url).pathname;
  const database = await getDb();
  const claimed = await database
    .insert(idempotencyKeys)
    .values({ key, userId: user?.id ?? null, method: request.method, path })
    .onConflictDoNothing()
    .returning({ key: idempotencyKeys.key });
  if (Math.random() < 0.01) {
    void database.delete(idempotencyKeys).where(lt(idempotencyKeys.createdAt, new Date(Date.now() - 7 * 24 * 3600 * 1000)));
  }
  if (claimed.length > 0) return null;

  const [existing] = await database.select().from(idempotencyKeys).where(eq(idempotencyKeys.key, key));
  if (!existing || existing.userId !== (user?.id ?? null) || existing.method !== request.method || existing.path !== path) {
    return Response.json({ error: "Cette clé d'idempotence a déjà servi pour une autre requête." }, { status: 422 });
  }
  if (existing.status === null) {
    return Response.json({ error: "Cette action est déjà en cours de traitement." }, { status: 409, headers: { "retry-after": "2" } });
  }
  const headers = { "idempotent-replayed": "true" };
  if (existing.response === null) return new Response(null, { status: existing.status, headers });
  return Response.json(existing.response, { status: existing.status, headers });
}

async function rememberResponse(key: string, response: Response) {
  const text = await response.clone().text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }
  const database = await getDb();
  await database.update(idempotencyKeys).set({ status: response.status, response: body }).where(eq(idempotencyKeys.key, key));
}

async function releaseIdempotencyKey(key: string) {
  const database = await getDb();
  await database.delete(idempotencyKeys).where(eq(idempotencyKeys.key, key));
}

// --- Logs -----------------------------------------------------------------------------------

const UUID_IN_PATH = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

/** /api/incidents/3f2…/priority → /api/incidents/:id/priority, to group requests by route. */
const routePattern = (path: string) => path.replace(UUID_IN_PATH, ":id");

function report(request: Request, response: Response, context: RequestContext, durationMs: number) {
  const path = new URL(request.url).pathname;
  log({
    level: response.status >= 500 ? "error" : response.status >= 400 ? "warn" : "info",
    dataset: "api.request",
    message: `${request.method} ${routePattern(path)} ${response.status} ${Math.round(durationMs)} ms`,
    "http.request.method": request.method,
    "url.path": routePattern(path),
    "http.response.status_code": response.status,
    "event.duration": Math.round(durationMs * 1e6),
    duration_ms: Math.round(durationMs * 10) / 10,
    "user.id": context.user?.id,
    "user.roles": context.user ? [context.user.role] : undefined,
    "trace.id": context.requestId,
    offline_replay: context.offline,
    idempotent_replay: response.headers.get("idempotent-replayed") === "true",
  });
  for (const event of context.events) {
    log({
      level: "info",
      dataset: "domain.event",
      message: `${event.type} ${event.aggregateType}/${event.aggregateId}`,
      "event.action": event.type,
      "event.sequence": event.sequence,
      aggregate_type: event.aggregateType,
      aggregate_id: event.aggregateId,
      "event.created": event.occurredAt,
      "event.ingested": event.recordedAt,
      // How long the action waited on the device before reaching the server.
      sync_lag_ms: new Date(event.recordedAt).getTime() - new Date(event.occurredAt).getTime(),
      source: event.source,
      "user.id": event.actorId ?? undefined,
      "trace.id": context.requestId,
    });
  }
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
  const context = requestContext();
  if (context) context.user = { id: user.id, role: user.role };
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
