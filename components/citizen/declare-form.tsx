"use client";

import { useState, useSyncExternalStore } from "react";
import { LocationPicker } from "@/components/map/location-picker";
import { cn } from "@/components/ui/cn";
import { Field, FormMessage, Input, Textarea } from "@/components/ui/form";
import { IncidentIcon } from "@/components/ui/incident-icon";
import { SubmitButton } from "@/components/ui/submit-button";
import { useApiForm } from "@/lib/use-api-form";
import type { IncidentTypeOption } from "./sos-dialog";

const noop = () => () => {};

/** Detailed declaration form (6.1.2): type, when, who, what, where. */
export function DeclareForm({ types }: { types: IncidentTypeOption[] }) {
  const [state, action] = useApiForm({ method: "POST", path: "/api/incidents", redirectTo: "/citoyen/incidents/{id}?nouveau=1" });
  const [now, setNow] = useState(true);
  const errors = state.fieldErrors ?? {};
  const values = state.values ?? {};
  // The browser's offset (the server may run in another time zone).
  const timezoneOffset = useSyncExternalStore(noop, () => new Date().getTimezoneOffset(), () => 0);
  return (
    <form action={action} className="flex flex-col gap-5">
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-slate-200">Type d&apos;incident</legend>
        <div className="grid grid-cols-3 gap-2">
          {types.map((type) => (
            <label key={type.id} className="cursor-pointer">
              <input type="radio" name="typeId" value={type.id} defaultChecked={values.typeId === String(type.id)} className="peer sr-only" required />
              <span
                className={cn(
                  "flex h-full flex-col items-center gap-1.5 rounded-2xl bg-white/5 px-1 py-3 text-center text-[11px] font-semibold leading-tight text-slate-300 ring-1 ring-inset ring-white/10",
                  "peer-checked:bg-sos/20 peer-checked:text-white peer-checked:ring-sos/70 peer-focus-visible:outline-2 peer-focus-visible:outline-sky-400",
                )}
              >
                <IncidentIcon code={type.code} size={20} />
                {type.label}
              </span>
            </label>
          ))}
        </div>
        {errors.typeId && <p className="mt-1 text-xs text-rose-300">{errors.typeId[0]}</p>}
      </fieldset>

      <Field label="Que se passe-t-il ?" name="description" errors={errors.description}>
        <Textarea name="description" rows={4} maxLength={2000} defaultValue={values.description} placeholder="Décrivez la situation, le nombre de suspects, la direction prise…" invalid={Boolean(errors.description)} required />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Personnes impliquées" name="peopleInvolved" errors={errors.peopleInvolved}>
          <Input name="peopleInvolved" type="number" inputMode="numeric" min={0} max={10000} defaultValue={values.peopleInvolved ?? "1"} />
        </Field>
        <Field label="Super-vilain (si connu)" name="reportedVillainName" errors={errors.reportedVillainName}>
          <Input name="reportedVillainName" maxLength={100} defaultValue={values.reportedVillainName} placeholder="Ex. Le Rhino" />
        </Field>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium text-slate-200">Quand ?</legend>
        <div className="flex gap-2">
          {[
            [true, "À l'instant"],
            [false, "Plus tôt"],
          ].map(([value, label]) => (
            <button
              key={String(value)}
              type="button"
              aria-pressed={now === value}
              onClick={() => setNow(value as boolean)}
              className={cn("rounded-xl px-3 py-1.5 text-sm font-semibold ring-1 ring-inset", now === value ? "bg-sky-400/20 text-sky-50 ring-sky-300/40" : "text-slate-400 ring-white/10")}
            >
              {label as string}
            </button>
          ))}
        </div>
        {!now && (
          <Field label="Date et heure" name="occurredAt" errors={errors.occurredAt}>
            <Input name="occurredAt" type="datetime-local" required defaultValue={values.occurredAt} invalid={Boolean(errors.occurredAt)} />
          </Field>
        )}
        {/* Lets the server read the datetime in the citizen's time zone. */}
        <input type="hidden" name="timezoneOffset" value={timezoneOffset} />
      </fieldset>

      <div>
        <p className="mb-2 text-sm font-medium text-slate-200">Où ?</p>
        <LocationPicker
          locateOnMount
          errors={errors}
          defaultAddress={{ street: values.street, postalCode: values.postalCode, city: values.city, country: values.country }}
          defaultPosition={values.latitude && values.longitude ? { lat: Number(values.latitude), lng: Number(values.longitude) } : null}
        />
      </div>

      <FormMessage state={state} />
      <SubmitButton variant="danger" size="lg" pendingLabel="Envoi du signalement…">
        Signaler l&apos;incident
      </SubmitButton>
      <p className="text-center text-xs text-slate-500">Les super-héros et les modérateurs sont prévenus immédiatement. En cas d&apos;urgence vitale, appelez aussi le 112.</p>
    </form>
  );
}
