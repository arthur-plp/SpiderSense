"use client";

import { CircleCheck, CircleX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { Checkbox, Field, Input, Select } from "@/components/ui/form";
import type { IncidentDto } from "@/lib/server/services/incidents";
import type { VillainOption } from "./incident-detail";

export type InterventionReport = {
  outcome: "SUCCEEDED" | "FAILED";
  villainId: string | null;
  villainImprisoned: boolean;
  peopleInvolved: number;
};

/** End-of-intervention report: outcome, villain identified, arrest, people involved. */
export function CloseInterventionForm({
  incident,
  villains,
  pending,
  onSubmit,
}: {
  incident: IncidentDto;
  villains: VillainOption[];
  pending: boolean;
  onSubmit: (report: InterventionReport) => void;
}) {
  // Pre-select the villain the citizen named, when it matches the encyclopedia.
  const guessed =
    incident.villain?.id ??
    villains.find((villain) => villain.alias.toLowerCase() === incident.reportedVillainName?.toLowerCase())?.id ??
    "";
  const [outcome, setOutcome] = useState<"SUCCEEDED" | "FAILED">("SUCCEEDED");
  const [villainId, setVillainId] = useState(guessed);
  const [imprisoned, setImprisoned] = useState(false);
  const [people, setPeople] = useState(String(incident.peopleInvolved));

  const canImprison = outcome === "SUCCEEDED" && villainId !== "";
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <form
      ref={formRef}
      className="space-y-4 rounded-2xl border border-amber-300/25 bg-amber-300/5 p-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({
          outcome,
          villainId: villainId || null,
          villainImprisoned: canImprison && imprisoned,
          peopleInvolved: Math.max(0, Number.parseInt(people, 10) || 0),
        });
      }}
    >
      <h3 className="text-sm font-semibold text-amber-100">Rapport d&apos;intervention</h3>
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-slate-200">Résultat</legend>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              { value: "SUCCEEDED", label: "Réussie", icon: CircleCheck, active: "bg-emerald-400/20 ring-emerald-300/60 text-emerald-100" },
              { value: "FAILED", label: "Échouée", icon: CircleX, active: "bg-rose-500/20 ring-rose-300/60 text-rose-100" },
            ] as const
          ).map((option) => (
            <label
              key={option.value}
              className={cn(
                "flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-white/5 py-2.5 text-sm font-semibold text-slate-300 ring-1 ring-inset ring-white/10 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-sky-400",
                outcome === option.value && option.active,
              )}
            >
              <input
                type="radio"
                name="outcome"
                value={option.value}
                checked={outcome === option.value}
                onChange={() => setOutcome(option.value)}
                className="sr-only"
              />
              <option.icon className="size-4" aria-hidden />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      <Field label="Super-vilain impliqué" name="villainId">
        <Select name="villainId" value={villainId} onChange={(event) => setVillainId(event.target.value)}>
          <option value="">Non identifié</option>
          {villains.map((villain) => (
            <option key={villain.id} value={villain.id} disabled={villain.status === "IMPRISONED" && villain.id !== guessed}>
              {villain.alias}
              {villain.status === "IMPRISONED" ? " (déjà en prison)" : ""}
            </option>
          ))}
        </Select>
      </Field>

      <Checkbox
        label="Le super-vilain a été mis en prison"
        checked={canImprison && imprisoned}
        disabled={!canImprison}
        onChange={(event) => setImprisoned(event.target.checked)}
      />

      <Field label="Citoyens impliqués" name="peopleInvolved" hint="Compte dans les statistiques de citoyens secourus si l'intervention est réussie.">
        <Input name="peopleInvolved" type="number" min={0} max={10000} value={people} onChange={(event) => setPeople(event.target.value)} />
      </Field>

      <Button type="submit" variant="brand" className="w-full" disabled={pending}>
        {pending ? "Envoi du rapport…" : "Clôturer l'intervention"}
      </Button>
    </form>
  );
}
