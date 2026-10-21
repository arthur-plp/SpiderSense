"use client";

import { useOptimistic, useTransition } from "react";
import { cn } from "@/components/ui/cn";
import { setOnDutyAction } from "@/lib/actions/incidents";

/** "En service / Hors service": off-duty heroes show as unavailable to citizens. */
export function DutyToggle({ onDuty, busy }: { onDuty: boolean; busy: boolean }) {
  const [optimistic, setOptimistic] = useOptimistic(onDuty);
  const [, startTransition] = useTransition();
  const label = busy ? "En intervention" : optimistic ? "En service" : "Hors service";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={optimistic}
      disabled={busy}
      onClick={() =>
        startTransition(async () => {
          setOptimistic(!optimistic);
          await setOnDutyAction(!optimistic);
        })
      }
      className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-semibold text-slate-200 hover:bg-white/5 disabled:cursor-default"
      title={busy ? "Vous êtes en intervention" : "Changer votre disponibilité"}
    >
      <span className={cn("relative h-5 w-9 rounded-full transition", optimistic ? "bg-emerald-400/80" : "bg-slate-600")}>
        <span className={cn("absolute top-0.5 size-4 rounded-full bg-white shadow transition-all", optimistic ? "left-[18px]" : "left-0.5")} />
      </span>
      <span className={cn(busy ? "text-sky-300" : optimistic ? "text-emerald-300" : "text-slate-400")}>{label}</span>
    </button>
  );
}
