"use client";

import { ChevronDown, LoaderCircle } from "lucide-react";
import { useId, useRef } from "react";
import { cn } from "@/components/ui/cn";
import type { ApiEndpoint } from "@/lib/api-client";
import { type IncidentPriority, PRIORITY_LABELS } from "@/lib/labels";
import { useApiForm } from "@/lib/use-api-form";

const TONES: Record<IncidentPriority | "NONE", string> = {
  HIGH: "border-rose-400/40 bg-rose-500/10 text-rose-200",
  NORMAL: "border-amber-400/35 bg-amber-400/10 text-amber-200",
  LOW: "border-sky-400/35 bg-sky-400/10 text-sky-200",
  NONE: "border-dashed border-slate-400/30 bg-transparent text-slate-400",
};

/** Inline Haute / Normale / Basse picker, saved as soon as it changes. */
export function PrioritySelect({
  endpoint,
  priority,
  label = "Priorité",
}: {
  endpoint: ApiEndpoint;
  priority: IncidentPriority | null;
  label?: string;
}) {
  const [state, formAction, pending] = useApiForm(endpoint);
  const formRef = useRef<HTMLFormElement>(null);
  const id = useId();
  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-1">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div className="relative inline-flex items-center">
        <select
          id={id}
          name="priority"
          defaultValue={priority ?? ""}
          aria-busy={pending}
          onChange={() => formRef.current?.requestSubmit()}
          className={cn(
            "h-8 cursor-pointer appearance-none rounded-lg border py-0 pl-2.5 pr-7 text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60",
            TONES[priority ?? "NONE"],
          )}
        >
          <option value="" disabled>
            À définir
          </option>
          {(Object.keys(PRIORITY_LABELS) as IncidentPriority[]).map((value) => (
            <option key={value} value={value} className="bg-ink-850 text-slate-100">
              {PRIORITY_LABELS[value]}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-2 flex text-current opacity-70" aria-hidden>
          {pending ? <LoaderCircle className="size-3.5 animate-spin" /> : <ChevronDown className="size-3.5" />}
        </span>
      </div>
      <noscript>
        <button type="submit" className="text-xs text-sky-300 underline">
          Enregistrer
        </button>
      </noscript>
      {state.status === "error" && (
        <p role="alert" className="text-xs text-rose-300">
          {state.message}
        </p>
      )}
    </form>
  );
}
