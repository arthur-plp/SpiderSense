import { Shield } from "lucide-react";
import { IncidentIcon } from "@/components/ui/incident-icon";
import { cn } from "@/components/ui/cn";
import { type IncidentPriority, type IncidentStatus, PRIORITY_COLORS, STATUS_COLORS } from "@/lib/labels";

/** Incident pin: coloured by priority (or status once handled), pulses while waiting for a hero. */
export function IncidentPin({
  typeCode,
  status,
  priority,
  selected,
}: {
  typeCode: string;
  status: IncidentStatus;
  priority: IncidentPriority | null;
  selected?: boolean;
}) {
  const color = status === "REPORTED" ? (priority ? PRIORITY_COLORS[priority] : "#e2e8f0") : STATUS_COLORS[status];
  const waiting = status === "REPORTED";
  return (
    <span className={cn("relative flex items-center justify-center transition-transform duration-200", selected && "scale-125")}>
      {waiting && (
        <span
          className="absolute size-9 rounded-full animate-marker-pulse"
          style={{ backgroundColor: color, opacity: 0.5 }}
          aria-hidden
        />
      )}
      <span
        className={cn(
          "relative flex size-9 items-center justify-center rounded-full border-2 bg-ink-900/90 shadow-lg backdrop-blur",
          selected && "ring-4 ring-sky-300/40",
        )}
        style={{ borderColor: color, color, boxShadow: `0 0 18px -2px ${color}` }}
      >
        <IncidentIcon code={typeCode} size={16} />
      </span>
    </span>
  );
}

/** Hero position: shield badge, green when available. */
export function HeroPin({ alias, available, busy }: { alias: string; available: boolean; busy: boolean }) {
  const color = busy ? "#38bdf8" : available ? "#34d399" : "#64748b";
  return (
    <span className="flex flex-col items-center">
      <span
        className="flex size-8 items-center justify-center rounded-xl border bg-ink-900/90 backdrop-blur"
        style={{ borderColor: color, color, boxShadow: `0 0 14px -3px ${color}` }}
      >
        <Shield size={15} strokeWidth={2.2} />
      </span>
      <span className="mt-1 max-w-24 truncate rounded-md bg-ink-950/80 px-1.5 py-0.5 text-[10px] font-semibold text-slate-200">
        {alias}
      </span>
    </span>
  );
}

/** The current user's position (blue dot with halo). */
export function UserPin() {
  return (
    <span className="relative flex size-5 items-center justify-center">
      <span className="absolute size-5 rounded-full bg-sky-400/60 animate-marker-pulse" aria-hidden />
      <span className="relative size-3.5 rounded-full border-2 border-white bg-sky-500 shadow-[0_0_12px_rgb(56_189_248)]" />
    </span>
  );
}
