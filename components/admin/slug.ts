// Shared by the article form (live preview) and the server (source of truth).

const COMBINING_MARKS = /[\u0300-\u036f]/g;

/** "Les héros à Paris !" → "les-heros-a-paris" */
export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120)
    .replace(/-+$/g, "");
}
