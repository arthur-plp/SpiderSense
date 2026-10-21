"use client";

import { Trash2 } from "lucide-react";
import { useActionState } from "react";
import { Field, FormMessage, Select, Textarea } from "@/components/ui/form";
import { type ActionState, idleState } from "@/lib/action-state";
import { ConfirmSubmit } from "./confirm-submit";

const REASONS = [
  { value: "DUPLICATE", label: "Doublon d'un incident déjà signalé" },
  { value: "FALSE_REPORT", label: "Signalement erroné ou abusif" },
  { value: "RESOLVED", label: "Situation déjà résolue" },
  { value: "OTHER", label: "Autre motif (à préciser)" },
];

/** Soft delete with a reason; the reporter receives it by email. */
export function DeleteIncidentForm({
  action,
  inProgress,
  defaultReason = "DUPLICATE",
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  inProgress: boolean;
  defaultReason?: string;
}) {
  const [state, formAction] = useActionState(action, idleState);
  const errors = state.fieldErrors ?? {};
  const fieldError = errors.reason?.[0] ?? errors.details?.[0];
  return (
    <form action={formAction} className="flex flex-col items-start gap-3">
      <ConfirmSubmit
        title="Supprimer cet incident ?"
        description={
          <>
            L&apos;incident disparaît de la carte et des statistiques. Le déclarant est prévenu par email avec le motif.
            {inProgress && " Le super-héros qui intervient sera libéré de cette intervention."}
          </>
        }
        confirmLabel="Supprimer l'incident"
        size="md"
        fields={
          <div className="flex flex-col gap-3">
            <Field label="Motif" name="reason">
              <Select name="reason" defaultValue={state.values?.reason ?? defaultReason}>
                {REASONS.map((reason) => (
                  <option key={reason.value} value={reason.value}>
                    {reason.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Précisions pour le déclarant" name="details" hint="Facultatif, sauf pour « Autre motif ».">
              <Textarea name="details" defaultValue={state.values?.details ?? ""} maxLength={500} rows={3} className="min-h-20" />
            </Field>
          </div>
        }
      >
        <Trash2 className="size-4" aria-hidden />
        Supprimer l&apos;incident
      </ConfirmSubmit>
      {fieldError ? (
        <p role="alert" className="text-sm text-rose-300">
          {fieldError}
        </p>
      ) : (
        <FormMessage state={state} />
      )}
    </form>
  );
}
