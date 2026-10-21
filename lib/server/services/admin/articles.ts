import "server-only";
import { and, desc, eq, like, ne, sql } from "drizzle-orm";
import { articles, users } from "@/db/schema";
import { slugify } from "@/components/admin/slug";
import { logActivity } from "../../activity";
import { db, isUniqueViolation } from "../../db";
import type { MutationResult } from "../incidents";

export type ArticleStatus = "DRAFT" | "PUBLISHED";

export type AdminArticle = {
  id: string;
  title: string;
  slug: string;
  coverUrl: string | null;
  contentHtml: string;
  status: ArticleStatus;
  authorName: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

async function selectArticles(id?: string): Promise<AdminArticle[]> {
  const database = await db();
  const rows = await database
    .select({
      id: articles.id,
      title: articles.title,
      slug: articles.slug,
      coverUrl: articles.coverUrl,
      contentHtml: articles.contentHtml,
      status: articles.status,
      authorFirstName: users.firstName,
      authorLastName: users.lastName,
      publishedAt: articles.publishedAt,
      createdAt: articles.createdAt,
      updatedAt: articles.updatedAt,
    })
    .from(articles)
    .leftJoin(users, eq(articles.authorId, users.id))
    .where(id ? eq(articles.id, id) : undefined)
    .orderBy(desc(sql`coalesce(${articles.publishedAt}, ${articles.updatedAt})`));
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    coverUrl: row.coverUrl,
    contentHtml: row.contentHtml,
    status: row.status,
    authorName: row.authorFirstName ? `${row.authorFirstName} ${row.authorLastName}` : null,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }));
}

export function listAdminArticles(): Promise<AdminArticle[]> {
  return selectArticles();
}

export async function getAdminArticle(id: string): Promise<AdminArticle | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [article] = await selectArticles(id);
  return article ?? null;
}

/** First free slug among "base", "base-2", "base-3"… */
async function availableSlug(base: string, exceptId: string | null): Promise<string> {
  const database = await db();
  const taken = await database
    .select({ slug: articles.slug })
    .from(articles)
    .where(and(like(articles.slug, `${base}%`), exceptId ? ne(articles.id, exceptId) : undefined));
  const used = new Set(taken.map((row) => row.slug));
  if (!used.has(base)) return base;
  let suffix = 2;
  while (used.has(`${base}-${suffix}`)) suffix++;
  return `${base}-${suffix}`;
}

export type ArticleInput = {
  title: string;
  /** Typed by the moderator; null to derive it from the title. */
  slug: string | null;
  coverUrl: string | null;
  contentHtml: string;
  status: ArticleStatus;
};

export type SaveArticleResult = { ok: true; id: string; slug: string } | { ok: false; error: string; field?: "slug" };

export async function saveArticle(id: string | null, input: ArticleInput, actorId: string): Promise<SaveArticleResult> {
  const database = await db();
  const [existing] = id
    ? await database.select({ publishedAt: articles.publishedAt }).from(articles).where(eq(articles.id, id))
    : [];
  if (id && !existing) return { ok: false, error: "Cet article n'existe plus." };

  let slug: string;
  if (input.slug) {
    slug = slugify(input.slug);
    if (!slug) return { ok: false, error: "Le slug doit contenir des lettres ou des chiffres.", field: "slug" };
    const [conflict] = await database
      .select({ id: articles.id })
      .from(articles)
      .where(and(eq(articles.slug, slug), id ? ne(articles.id, id) : undefined));
    if (conflict) return { ok: false, error: "Ce slug est déjà utilisé par un autre article.", field: "slug" };
  } else {
    slug = await availableSlug(slugify(input.title) || "article", id);
  }

  const values = {
    title: input.title,
    slug,
    coverUrl: input.coverUrl,
    contentHtml: input.contentHtml,
    status: input.status,
    // The publication date is the first one: unpublishing then republishing keeps it.
    publishedAt: input.status === "PUBLISHED" ? (existing?.publishedAt ?? new Date()) : (existing?.publishedAt ?? null),
  };

  let savedId: string;
  try {
    if (id) {
      await database.update(articles).set(values).where(eq(articles.id, id));
      savedId = id;
    } else {
      const [created] = await database.insert(articles).values({ ...values, authorId: actorId }).returning({ id: articles.id });
      savedId = created.id;
    }
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false, error: "Ce slug est déjà utilisé par un autre article.", field: "slug" };
    throw error;
  }
  await logActivity({
    actorId,
    action: id ? "article.update" : "article.create",
    entityType: "article",
    entityId: savedId,
    metadata: { title: input.title, status: input.status },
  });
  return { ok: true, id: savedId, slug };
}

export async function deleteArticle(id: string, actorId: string): Promise<MutationResult> {
  const database = await db();
  const [row] = await database.delete(articles).where(eq(articles.id, id)).returning({ title: articles.title });
  if (!row) return { ok: false, error: "Cet article a déjà été supprimé." };
  await logActivity({ actorId, action: "article.delete", entityType: "article", entityId: id, metadata: { title: row.title } });
  return { ok: true };
}
