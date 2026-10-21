import type { ReactNode } from "react";
import {
  type IncidentPriority,
  type IncidentStatus,
  PRIORITY_LABELS,
  PRIORITY_TONES,
  STATUS_LABELS,
  STATUS_TONES,
  type Tone,
} from "@/lib/labels";
import { cn } from "./cn";

const tones: Record<Tone, string> = {
  neutral: "bg-slate-400/10 text-slate-300 ring-slate-400/20",
  info: "bg-sky-400/10 text-sky-300 ring-sky-400/30",
  success: "bg-emerald-400/10 text-emerald-300 ring-emerald-400/30",
  warning: "bg-amber-400/10 text-amber-300 ring-amber-400/30",
  danger: "bg-rose-500/12 text-rose-300 ring-rose-400/35",
  brand: "bg-brand/10 text-amber-200 ring-brand/30",
};

export function Badge({ tone = "neutral", children, className, dot }: { tone?: Tone; children: ReactNode; className?: string; dot?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
        tones[tone],
        className,
      )}
    >
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}

export function StatusBadge({ status, className }: { status: IncidentStatus; className?: string }) {
  return (
    <Badge tone={STATUS_TONES[status]} dot className={className}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}

export function PriorityBadge({ priority, className }: { priority: IncidentPriority | null; className?: string }) {
  if (!priority) {
    return (
      <Badge tone="neutral" className={className}>
        Priorité à définir
      </Badge>
    );
  }
  return (
    <Badge tone={PRIORITY_TONES[priority]} className={className}>
      Priorité {PRIORITY_LABELS[priority].toLowerCase()}
    </Badge>
  );
}
