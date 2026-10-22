"use client";

import { useState } from "react";
import { Field, FormMessage, Input, Select, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ApiEndpoint } from "@/lib/api-client";
import { VILLAIN_STATUS_LABELS } from "@/lib/labels";
import { useApiForm } from "@/lib/use-api-form";

type VillainStatus = keyof typeof VILLAIN_STATUS_LABELS;

export type VillainFormDefaults = {
  alias: string;
  firstName: string | null;
  lastName: string | null;
  description: string | null;
  mainSector: string | null;
  imageUrl: string | null;
  status: VillainStatus;
  imprisonedAt: string | null;
  specialtyIds: number[];
};

const parisDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" });

export function VillainForm({
  endpoint,
  types,
  villain,
  submitLabel,
}: {
  endpoint: ApiEndpoint;
  types: { id: number; label: string }[];
  villain?: VillainFormDefaults;
  submitLabel: string;
}) {
  const [state, formAction] = useApiForm(endpoint);
  const errors = state.fieldErrors ?? {};
  const values = state.values;
  const text = (key: "alias" | "firstName" | "lastName" | "description" | "mainSector" | "imageUrl") =>
    values?.[key] ?? villain?.[key] ?? "";
  const [status, setStatus] = useState<VillainStatus>(villain?.status ?? "AT_LARGE");
  const specialties = new Set(
    values ? (values.specialties ?? "").split(",").filter(Boolean).map(Number) : (villain?.specialtyIds ?? []),
  );

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Nom de super-vilain" name="alias" errors={errors.alias} className="sm:col-span-3">
          <Input name="alias" defaultValue={text("alias")} maxLength={100} required invalid={Boolean(errors.alias)} />
        </Field>
        <Field label="Prénom (si connu)" name="firstName" errors={errors.firstName}>
          <Input name="firstName" defaultValue={text("firstName")} maxLength={100} invalid={Boolean(errors.firstName)} />
        </Field>
        <Field label="Nom (si connu)" name="lastName" errors={errors.lastName}>
          <Input name="lastName" defaultValue={text("lastName")} maxLength={100} invalid={Boolean(errors.lastName)} />
        </Field>
        <Field label="Secteur principal" name="mainSector" errors={errors.mainSector} hint="Quartier ou zone d'activité.">
          <Input name="mainSector" defaultValue={text("mainSector")} maxLength={255} invalid={Boolean(errors.mainSector)} />
        </Field>
      </div>

      <Field label="Description" name="description" errors={errors.description}>
        <Textarea name="description" defaultValue={text("description")} maxLength={4000} rows={5} invalid={Boolean(errors.description)} />
      </Field>

      <Field label="Image (URL)" name="imageUrl" errors={errors.imageUrl} hint="Facultatif. Adresse http(s) d'une image publique.">
        <Input name="imageUrl" type="url" inputMode="url" defaultValue={text("imageUrl")} invalid={Boolean(errors.imageUrl)} />
      </Field>

      <fieldset>
        <legend className="text-sm font-medium text-slate-200">Spécialités</legend>
        <p className="mb-2 text-xs text-slate-500">Types d&apos;incidents dans lesquels ce vilain est impliqué.</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {types.map((type) => (
            <label
              key={type.id}
              className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2 text-sm text-slate-300 has-[:checked]:border-sky-400/40 has-[:checked]:bg-sky-400/10 has-[:checked]:text-sky-100"
            >
              <input
                type="checkbox"
                name="specialties"
                value={type.id}
                defaultChecked={specialties.has(type.id)}
                className="size-4 accent-sky-400"
              />
              {type.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Statut" name="status" errors={errors.status}>
          <Select
            name="status"
            defaultValue={values?.status ?? villain?.status ?? "AT_LARGE"}
            onChange={(event) => setStatus(event.target.value as VillainStatus)}
            invalid={Boolean(errors.status)}
          >
            {(Object.keys(VILLAIN_STATUS_LABELS) as VillainStatus[]).map((value) => (
              <option key={value} value={value}>
                {VILLAIN_STATUS_LABELS[value]}
              </option>
            ))}
          </Select>
        </Field>
        {status === "IMPRISONED" && (
          <Field label="Emprisonné le" name="imprisonedAt" errors={errors.imprisonedAt} hint="Aujourd'hui si laissé vide.">
            <Input
              name="imprisonedAt"
              type="date"
              defaultValue={values?.imprisonedAt ?? (villain?.imprisonedAt ? parisDate.format(new Date(villain.imprisonedAt)) : "")}
              invalid={Boolean(errors.imprisonedAt)}
            />
          </Field>
        )}
      </div>

      <FormMessage state={state} />
      <div className="flex justify-end">
        <SubmitButton pendingLabel="Enregistrement…">{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
