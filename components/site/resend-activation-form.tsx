"use client";

import { Inbox, RefreshCw } from "lucide-react";
import Link from "next/link";
import { Field, FormMessage, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { useApiForm } from "@/lib/use-api-form";

/**
 * Sends a new activation link. With `hiddenEmail`, only the button shows
 * (login page, where the address is already known).
 */
export function ResendActivationForm({
  email,
  hiddenEmail = false,
  mailboxHref,
}: {
  email?: string | null;
  hiddenEmail?: boolean;
  mailboxHref?: string | null;
}) {
  const [state, formAction] = useApiForm({ method: "POST", path: "/api/auth/resend-activation" });
  return (
    <form action={formAction} className="space-y-3">
      {hiddenEmail && email ? (
        <input type="hidden" name="email" value={email} />
      ) : (
        <Field label="Adresse email du compte" name="email">
          <Input name="email" type="email" required autoComplete="email" defaultValue={email ?? undefined} placeholder="vous@exemple.fr" />
        </Field>
      )}
      <FormMessage state={state} />
      <div className="flex flex-wrap gap-2">
        <SubmitButton variant="secondary" pendingLabel="Envoi en cours…">
          <RefreshCw size={16} aria-hidden />
          Renvoyer le lien d&apos;activation
        </SubmitButton>
        {state.status === "success" && mailboxHref && (
          <Link href={mailboxHref} className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-sky-300 hover:bg-white/5">
            <Inbox size={16} aria-hidden />
            Ouvrir la boîte mail de démo
          </Link>
        )}
      </div>
    </form>
  );
}
