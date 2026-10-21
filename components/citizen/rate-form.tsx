"use client";

import { useActionState } from "react";
import { FormMessage, Textarea } from "@/components/ui/form";
import { StarInput } from "@/components/ui/star-input";
import { SubmitButton } from "@/components/ui/submit-button";
import { idleState } from "@/lib/action-state";
import { rateIntervention } from "@/lib/actions/incidents";

/** Satisfaction form (6.1.3): rating out of 5 and an optional comment. */
export function RateForm({ incidentId, heroAlias }: { incidentId: string; heroAlias: string }) {
  const [state, action] = useActionState(rateIntervention.bind(null, incidentId), idleState);
  if (state.status === "success") return <FormMessage state={state} />;
  return (
    <form action={action} className="flex flex-col gap-3">
      <p className="text-sm text-slate-300">Comment s&apos;est passée l&apos;intervention de {heroAlias} ?</p>
      <StarInput name="rating" defaultValue={Number(state.values?.rating ?? 0)} />
      {state.fieldErrors?.rating && <p className="text-xs text-rose-300">{state.fieldErrors.rating[0]}</p>}
      <label htmlFor="comment" className="text-sm font-medium text-slate-200">
        Commentaire <span className="font-normal text-slate-500">(facultatif)</span>
      </label>
      <Textarea id="comment" name="comment" rows={3} maxLength={1000} defaultValue={state.values?.comment} placeholder="Votre avis aide les héros à progresser." />
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Envoi…">Envoyer mon avis</SubmitButton>
    </form>
  );
}
