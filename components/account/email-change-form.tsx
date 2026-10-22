"use client";

import { Clock } from "lucide-react";
import { Field, FormMessage, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatDate } from "@/lib/format";
import { useApiForm } from "@/lib/use-api-form";

/** Email changes go through moderation (5.8.3 / 6.1.1). */
export function EmailChangeForm({ currentEmail, pending }: { currentEmail: string; pending: { newEmail: string; createdAt: Date } | null }) {
  const [state, action] = useApiForm({ method: "POST", path: "/api/me/email-change" });
  const [, cancelAction] = useApiForm({ method: "DELETE", path: "/api/me/email-change" });
  if (pending) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-amber-300/25 bg-amber-300/5 p-4 text-sm">
        <p className="flex items-start gap-2 text-amber-100">
          <Clock className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            Changement vers <strong>{pending.newEmail}</strong> demandé le {formatDate(pending.createdAt)} : en attente de validation par un modérateur.
          </span>
        </p>
        <form action={cancelAction}>
          <SubmitButton variant="secondary" size="sm">Annuler la demande</SubmitButton>
        </form>
      </div>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-4">
      <p className="text-sm text-slate-400">
        Adresse actuelle : <span className="text-slate-200">{currentEmail}</span>
      </p>
      <Field label="Nouvelle adresse email" name="newEmail" errors={state.fieldErrors?.newEmail} hint="La modification sera effective après validation par la modération.">
        <Input name="newEmail" type="email" autoComplete="email" defaultValue={state.values?.newEmail} invalid={Boolean(state.fieldErrors?.newEmail)} required />
      </Field>
      <FormMessage state={state} />
      <SubmitButton className="self-start" pendingLabel="Envoi…">Demander le changement</SubmitButton>
    </form>
  );
}
