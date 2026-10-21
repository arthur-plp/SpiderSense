// Explicit time zone so the server and the browser render the same text.
const TIME_ZONE = "Europe/Paris";

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "long",
  timeZone: TIME_ZONE,
});
const shortDateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: TIME_ZONE,
});
const dateTimeFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: TIME_ZONE,
});
const timeFormatter = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: TIME_ZONE,
});
const relativeFormatter = new Intl.RelativeTimeFormat("fr-FR", { numeric: "auto" });
const numberFormatter = new Intl.NumberFormat("fr-FR");

type DateInput = Date | string | number;
const toDate = (value: DateInput) => (value instanceof Date ? value : new Date(value));

export const formatDate = (value: DateInput) => dateFormatter.format(toDate(value));
export const formatShortDate = (value: DateInput) => shortDateFormatter.format(toDate(value));
export const formatDateTime = (value: DateInput) => dateTimeFormatter.format(toDate(value));
export const formatTime = (value: DateInput) => timeFormatter.format(toDate(value));
export const formatNumber = (value: number) => numberFormatter.format(value);

export function formatRating(value: number | null): string {
  return value === null ? "—" : value.toFixed(1).replace(".", ",");
}

/** "à l'instant", "il y a 5 minutes", "hier"… relative to `now`. */
export function formatRelative(value: DateInput, now: number): string {
  const seconds = Math.round((toDate(value).getTime() - now) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 60) return "à l'instant";
  if (abs < 3600) return relativeFormatter.format(Math.round(seconds / 60), "minute");
  if (abs < 86_400) return relativeFormatter.format(Math.round(seconds / 3600), "hour");
  if (abs < 86_400 * 30) return relativeFormatter.format(Math.round(seconds / 86_400), "day");
  return formatDate(value);
}

export function fullName(person: { firstName: string | null; lastName: string | null }): string {
  return [person.firstName, person.lastName].filter(Boolean).join(" ");
}

export function initials(label: string): string {
  return label
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${formatNumber(count)} ${count > 1 ? plural : singular}`;
}
