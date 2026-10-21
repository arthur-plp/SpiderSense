import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/components/ui/cn";
import { RelativeTime } from "@/components/ui/relative-time";
import { ACTIVITY_LABELS, PRIORITY_LABELS, ROLE_LABELS, type IncidentPriority, type Role, type Tone } from "@/lib/labels";
import type { ActivityEntry } from "@/lib/server/services/admin/activity";

const ENTITY_LABELS: Record<string, string> = {
  incident: "Incident",
  user: "Compte",
  villain: "Vilain",
  article: "Article",
  review: "Avis",
  movie: "Film",
  newsletter: "Newsletter",
};

function entityHref({ entityType, entityId, action }: ActivityEntry): string | null {
  if (!entityId) return null;
  switch (entityType) {
    case "incident":
      return `/admin/incidents/${entityId}`;
    case "user":
      return `/admin/utilisateurs/${entityId}`;
    case "villain":
      return action === "villain.delete" ? null : `/admin/vilains/${entityId}`;
    case "article":
      return action === "article.delete" ? null : `/admin/blog/${entityId}`;
    case "review":
      return "/admin/avis";
    case "movie":
      return "/admin/demandes#films";
    case "newsletter":
      return "/admin/newsletter";
    default:
      return null;
  }
}

function toneOf(action: string): Tone {
  if (/\.(delete|disable|reject|hide|fail)$/.test(action)) return "danger";
  if (/\.(approve|verify|succeed|enable|show)$/.test(action)) return "success";
  if (action.startsWith("incident.")) return "warning";
  if (action.startsWith("user.") || action.startsWith("email.")) return "info";
  return "neutral";
}

const asText = (value: unknown) => (typeof value === "string" || typeof value === "number" ? String(value) : null);

/** Human summary of the metadata stored with the log entry. */
function details(metadata: ActivityEntry["metadata"]): string | null {
  if (!metadata) return null;
  const parts: string[] = [];
  const reason = asText(metadata.reason);
  if (reason) parts.push(`Motif : ${reason}`);
  const priority = asText(metadata.priority);
  if (priority && priority in PRIORITY_LABELS) parts.push(`Priorité ${PRIORITY_LABELS[priority as IncidentPriority].toLowerCase()}`);
  if (Array.isArray(metadata.fields) && metadata.fields.length > 0) parts.push(`Champs : ${metadata.fields.join(", ")}`);
  const from = asText(metadata.from);
  const to = asText(metadata.to);
  if (from && to) parts.push(`${ROLE_LABELS[from as Role] ?? from} → ${ROLE_LABELS[to as Role] ?? to}`);
  for (const key of ["alias", "title", "subject", "newEmail"]) {
    const value = asText(metadata[key]);
    if (value) parts.push(`« ${value} »`);
  }
  const recipients = asText(metadata.recipients);
  if (recipients) parts.push(`${recipients} destinataire(s)`);
  const rating = asText(metadata.rating);
  if (rating) parts.push(`${rating}/5`);
  if (metadata.villainImprisoned === true) parts.push("Vilain emprisonné");
  return parts.length > 0 ? parts.join(" · ") : null;
}

export function ActivityList({ entries, compact = false }: { entries: ActivityEntry[]; compact?: boolean }) {
  return (
    <ol className="flex flex-col">
      {entries.map((entry) => {
        const actorName = entry.actor ? `${entry.actor.firstName} ${entry.actor.lastName}` : "Compte supprimé";
        const href = entityHref(entry);
        const summary = details(entry.metadata);
        return (
          <li key={entry.id} className={cn("flex gap-3 border-b border-white/5 last:border-b-0", compact ? "py-2.5" : "py-3")}>
            <Avatar src={entry.actor?.avatarUrl} label={actorName} size={compact ? 30 : 36} className="mt-0.5" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                {entry.actor ? (
                  <Link href={`/admin/utilisateurs/${entry.actor.id}`} className="font-semibold text-slate-100 hover:text-sky-200">
                    {actorName}
                  </Link>
                ) : (
                  <span className="font-semibold text-slate-400">{actorName}</span>
                )}
                {entry.actor && !compact && <span className="text-xs text-slate-500">{ROLE_LABELS[entry.actor.role]}</span>}
                <Badge tone={toneOf(entry.action)}>{ACTIVITY_LABELS[entry.action] ?? entry.action}</Badge>
                {href ? (
                  <Link href={href} className="text-xs font-medium text-sky-300 hover:text-sky-200 hover:underline">
                    {ENTITY_LABELS[entry.entityType] ?? entry.entityType} →
                  </Link>
                ) : (
                  <span className="text-xs text-slate-500">{ENTITY_LABELS[entry.entityType] ?? entry.entityType}</span>
                )}
              </div>
              {summary && <p className="mt-0.5 truncate text-xs text-slate-400">{summary}</p>}
            </div>
            <RelativeTime value={entry.createdAt} className="shrink-0 pt-0.5 text-xs text-slate-500" />
          </li>
        );
      })}
    </ol>
  );
}
