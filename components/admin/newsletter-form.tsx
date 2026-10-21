"use client";

import { Send } from "lucide-react";
import { useActionState } from "react";
import { Field, FormMessage, Input, Select } from "@/components/ui/form";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { type ActionState, idleState } from "@/lib/action-state";
import { pluralize } from "@/lib/format";
import { ConfirmSubmit } from "./confirm-submit";

export function NewsletterForm({
  action,
  subscribers,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  subscribers: { id: string; email: string; name: string | null }[];
}) {
  const [state, formAction] = useActionState(action, idleState);
  const errors = state.fieldErrors ?? {};
  const target = state.values?.target ?? "ALL";
  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <Field label="Objet" name="subject" errors={errors.subject}>
        <Input name="subject" defaultValue={state.values?.subject ?? ""} maxLength={255} required invalid={Boolean(errors.subject)} />
      </Field>
      <RichTextEditor
        name="contentHtml"
        label="Contenu"
        defaultValue={state.values?.contentHtml ?? ""}
        errors={errors.contentHtml}
        hint="Statistiques du mois, bilan des interventions, articles à la une…"
      />
      {/* The subscriber picker is shown with CSS, so it follows the radios even after a form reset. */}
      <fieldset className="group flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium text-slate-200">Destinataires</legend>
        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-300">
          <input type="radio" name="target" value="ALL" defaultChecked={target === "ALL"} className="size-4 accent-sky-400" />
          Tous les abonnés actifs ({pluralize(subscribers.length, "abonné")})
        </label>
        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-300">
          <input type="radio" name="target" value="ONE" defaultChecked={target === "ONE"} className="size-4 accent-sky-400" />
          Un seul abonné (test, envoi ciblé)
        </label>
        <div className="hidden pl-6.5 group-has-[[value=ONE]:checked]:block">
          <Field label="Abonné" name="subscriptionId" errors={errors.subscriptionId}>
            <Select name="subscriptionId" defaultValue={state.values?.subscriptionId ?? ""} invalid={Boolean(errors.subscriptionId)}>
              <option value="">Choisir un abonné…</option>
              {subscribers.map((subscriber) => (
                <option key={subscriber.id} value={subscriber.id}>
                  {subscriber.name ? `${subscriber.name} — ${subscriber.email}` : subscriber.email}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        {errors.target && <p className="text-xs text-rose-300">{errors.target[0]}</p>}
      </fieldset>
      <FormMessage state={state} />
      <div className="flex justify-end">
        <ConfirmSubmit
          title="Envoyer la newsletter ?"
          description="Elle part immédiatement aux destinataires choisis, avec un lien de désinscription. Un envoi ne peut pas être annulé."
          confirmLabel="Envoyer"
          variant="primary"
          size="md"
        >
          <Send className="size-4" aria-hidden />
          Envoyer la newsletter
        </ConfirmSubmit>
      </div>
    </form>
  );
}
