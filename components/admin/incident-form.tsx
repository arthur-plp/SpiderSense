"use client";

import { Lock } from "lucide-react";
import { LocationPicker } from "@/components/map/location-picker";
import { Field, FormMessage, Input, Select, Textarea } from "@/components/ui/form";
import { Panel, SectionTitle } from "@/components/ui/panel";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ActionState } from "@/lib/action-state";
import type { ApiEndpoint } from "@/lib/api-client";
import { type IncidentPriority, PRIORITY_LABELS, VILLAIN_STATUS_LABELS } from "@/lib/labels";
import { useApiForm } from "@/lib/use-api-form";
import { TimezoneOffsetInput } from "./timezone-offset-input";

type IncidentType = { id: number; label: string };
type VillainOption = { id: string; alias: string; status: "AT_LARGE" | "IMPRISONED" };

type Defaults = {
  typeId: string;
  description: string;
  peopleInvolved: string;
  reportedVillainName: string;
  priority: string;
};

/** Fields shared by the "report" and "edit" forms. */
function DescriptionFields({ types, state, defaults }: { types: IncidentType[]; state: ActionState; defaults: Defaults }) {
  const errors = state.fieldErrors ?? {};
  const value = (key: keyof Defaults) => state.values?.[key] ?? defaults[key];
  return (
    <>
      <Field label="Type d'incident" name="typeId" errors={errors.typeId}>
        <Select name="typeId" defaultValue={value("typeId")} invalid={Boolean(errors.typeId)} required>
          <option value="" disabled>
            Choisir un type…
          </option>
          {types.map((type) => (
            <option key={type.id} value={type.id}>
              {type.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Description" name="description" errors={errors.description} hint="Ce qui se passe, combien de personnes, signes distinctifs…">
        <Textarea
          name="description"
          defaultValue={value("description")}
          invalid={Boolean(errors.description)}
          required
          minLength={10}
          maxLength={2000}
          rows={5}
        />
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Personnes impliquées" name="peopleInvolved" errors={errors.peopleInvolved}>
          <Input
            name="peopleInvolved"
            type="number"
            inputMode="numeric"
            min={0}
            max={10000}
            defaultValue={value("peopleInvolved")}
            invalid={Boolean(errors.peopleInvolved)}
          />
        </Field>
        <Field label="Priorité" name="priority" errors={errors.priority}>
          <Select name="priority" defaultValue={value("priority")} invalid={Boolean(errors.priority)}>
            <option value="">À définir</option>
            {(Object.keys(PRIORITY_LABELS) as IncidentPriority[]).map((priority) => (
              <option key={priority} value={priority}>
                {PRIORITY_LABELS[priority]}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field
        label="Super-vilain signalé"
        name="reportedVillainName"
        errors={errors.reportedVillainName}
        hint="Nom donné par le témoin, s'il est connu."
      >
        <Input
          name="reportedVillainName"
          defaultValue={value("reportedVillainName")}
          maxLength={100}
          invalid={Boolean(errors.reportedVillainName)}
        />
      </Field>
    </>
  );
}

/** "Signaler un incident" from the dashboard (moderator as reporter). */
export function IncidentCreateForm({ endpoint, types }: { endpoint: ApiEndpoint; types: IncidentType[] }) {
  const [state, formAction] = useApiForm(endpoint);
  const errors = state.fieldErrors ?? {};
  return (
    <form action={formAction} className="grid grid-cols-1 gap-6 lg:grid-cols-2" noValidate>
      <Panel className="flex flex-col gap-4 p-5">
        <SectionTitle>Situation</SectionTitle>
        <DescriptionFields
          types={types}
          state={state}
          defaults={{ typeId: "", description: "", peopleInvolved: "1", reportedVillainName: "", priority: "" }}
        />
        <Field label="Date et heure" name="occurredAt" errors={errors.occurredAt} hint="Laisser vide si l'incident est en cours.">
          <Input
            name="occurredAt"
            type="datetime-local"
            defaultValue={state.values?.occurredAt ?? ""}
            invalid={Boolean(errors.occurredAt)}
          />
        </Field>
        <TimezoneOffsetInput />
      </Panel>
      <Panel className="flex flex-col gap-4 p-5">
        <SectionTitle>Lieu</SectionTitle>
        <LocationPicker errors={errors} />
      </Panel>
      <div className="flex flex-col gap-3 lg:col-span-2">
        <FormMessage state={state} />
        <div className="flex justify-end">
          <SubmitButton variant="danger" pendingLabel="Envoi…">
            Signaler l&apos;incident
          </SubmitButton>
        </div>
      </div>
    </form>
  );
}

type EditableIncident = {
  typeId: number;
  description: string;
  peopleInvolved: number;
  reportedVillainName: string | null;
  priority: IncidentPriority | null;
  villainId: string | null;
  villainImprisoned: boolean;
  street: string | null;
  postalCode: string | null;
  city: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
};

/** Moderator correction of a report: descriptive fields only, never status or hero. */
export function IncidentEditForm({
  endpoint,
  incident,
  types,
  villains,
}: {
  endpoint: ApiEndpoint;
  incident: EditableIncident;
  types: IncidentType[];
  villains: VillainOption[];
}) {
  const [state, formAction] = useApiForm(endpoint);
  const errors = state.fieldErrors ?? {};
  const position = incident.latitude !== null && incident.longitude !== null ? { lat: incident.latitude, lng: incident.longitude } : null;
  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <div className="flex flex-col gap-4">
          <DescriptionFields
            types={types}
            state={state}
            defaults={{
              typeId: String(incident.typeId),
              description: incident.description,
              peopleInvolved: String(incident.peopleInvolved),
              reportedVillainName: incident.reportedVillainName ?? "",
              priority: incident.priority ?? "",
            }}
          />
          <Field
            label="Vilain de l'encyclopédie"
            name="villainId"
            errors={errors.villainId}
            hint={
              incident.villainImprisoned ? (
                <span className="inline-flex items-center gap-1">
                  <Lock className="size-3" aria-hidden />
                  Emprisonné lors de cette intervention : le lien ne peut plus changer.
                </span>
              ) : (
                "Relie l'incident à une fiche du répertoire des vilains."
              )
            }
          >
            <Select
              name="villainId"
              defaultValue={state.values?.villainId ?? incident.villainId ?? ""}
              invalid={Boolean(errors.villainId)}
              disabled={incident.villainImprisoned}
            >
              <option value="">Aucun vilain identifié</option>
              {villains.map((villain) => (
                <option key={villain.id} value={villain.id}>
                  {villain.alias} ({VILLAIN_STATUS_LABELS[villain.status].toLowerCase()})
                </option>
              ))}
            </Select>
          </Field>
          {/* A disabled select isn't posted: keep the current link. */}
          {incident.villainImprisoned && <input type="hidden" name="villainId" value={incident.villainId ?? ""} />}
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-slate-200">Lieu</p>
          <LocationPicker
            defaultPosition={position}
            defaultAddress={{
              street: incident.street ?? "",
              postalCode: incident.postalCode ?? "",
              city: incident.city,
              country: incident.country,
            }}
            errors={errors}
          />
        </div>
      </div>
      <FormMessage state={state} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500">Le déclarant sera prévenu par email des modifications.</p>
        <SubmitButton pendingLabel="Enregistrement…">Enregistrer les modifications</SubmitButton>
      </div>
    </form>
  );
}
