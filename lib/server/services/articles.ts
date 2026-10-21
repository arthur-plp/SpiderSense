import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { cache } from "react";
import type { Database } from "@/db";
import { articles } from "@/db/schema";
import { db } from "../db";

export type ArticleSummary = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverUrl: string | null;
  publishedAt: string;
  readingMinutes: number;
};

export type Article = ArticleSummary & { contentHtml: string; updatedAt: string };

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

function decodeCodePoint(code: number, fallback: string): string {
  return Number.isInteger(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : fallback;
}

/** Plain text of the (already sanitized) article HTML, for excerpts and reading time. */
function toPlainText(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&(?:#(\d+)|#x([0-9a-f]+)|([a-z]+));/gi, (match, decimal?: string, hex?: string, name?: string) => {
      if (decimal) return decodeCodePoint(Number(decimal), match);
      if (hex) return decodeCodePoint(parseInt(hex, 16), match);
      return NAMED_ENTITIES[(name ?? "").toLowerCase()] ?? match;
    })
    .replace(/\s+/g, " ")
    .trim();
}

function excerptOf(text: string, max = 180): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max / 2 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.!?—-]+$/, "")}…`;
}

function articleQuery(database: Database) {
  return database
    .select({
      id: articles.id,
      slug: articles.slug,
      title: articles.title,
      contentHtml: articles.contentHtml,
      coverUrl: articles.coverUrl,
      publishedAt: articles.publishedAt,
      createdAt: articles.createdAt,
      updatedAt: articles.updatedAt,
    })
    .from(articles);
}

type Row = Awaited<ReturnType<typeof articleQuery>>[number];

function toSummary(row: Row): ArticleSummary {
  const text = toPlainText(row.contentHtml);
  const words = text ? text.split(" ").length : 0;
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: excerptOf(text),
    coverUrl: row.coverUrl,
    // A published article always has a date; createdAt is only a safety net.
    publishedAt: (row.publishedAt ?? row.createdAt).toISOString(),
    readingMinutes: Math.max(1, Math.round(words / 200)),
  };
}

const isPublished = eq(articles.status, "PUBLISHED");
const newestFirst = desc(sql`coalesce(${articles.publishedAt}, ${articles.createdAt})`);

/** Blog: published articles, newest first. */
export async function listPublishedArticles(limit?: number): Promise<ArticleSummary[]> {
  const database = await db();
  const query = articleQuery(database).where(isPublished).orderBy(newestFirst);
  const rows = limit ? await query.limit(limit) : await query;
  return rows.map(toSummary);
}

/** A published article by slug (drafts are never exposed). Deduped per request. */
export const getPublishedArticle = cache(async (slug: string): Promise<Article | null> => {
  if (!slug || slug.length > 255) return null;
  const database = await db();
  const [row] = await articleQuery(database).where(and(isPublished, eq(articles.slug, slug)));
  if (!row) return null;
  return { ...toSummary(row), contentHtml: row.contentHtml, updatedAt: row.updatedAt.toISOString() };
});
