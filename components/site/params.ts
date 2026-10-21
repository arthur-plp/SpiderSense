/** First value of a search param (`?a=1&a=2` gives "1"). */
export function firstParam(value: string | string[] | undefined): string | null {
  const first = Array.isArray(value) ? value[0] : value;
  return first ?? null;
}
