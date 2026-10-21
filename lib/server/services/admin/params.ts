import "server-only";

export type SearchParams = Record<string, string | string[] | undefined>;

/** First value of a search param (`?a=1&a=2` → "1"). */
export const firstParam = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

export function parsePage(value: string | string[] | undefined): number {
  const page = Number(firstParam(value));
  return Number.isInteger(page) && page > 0 ? page : 1;
}
