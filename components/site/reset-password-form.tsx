"use client";

import { KeyRound } from "lucide-react";
import Link from "next/link";
import { Field, FormMessage } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ApiEndpoint } from "@/lib/api-client";
import { useApiForm } from "@/lib/use-api-form";
import { authLinkClass } from "./auth-shell";
import { PasswordInput } from "./password-input";

/** New password form; `endpoint` carries the token of the link. */
export function ResetPasswordForm({ endpoint }: { endpoint: ApiEndpoint }) {
  const [state, formAction] = useApiForm(endpoint);
  const errors = state.fieldErrors ?? {};
  return (
    <form action={formAction} className="space-y-5" noValidate>
      <FormMessage state={state} />
      {state.message && (
        <p className="text-sm text-slate-400">
          <Link href="/mot-de-passe-oublie" className={authLinkClass}>
            Demander un nouveau lien
          </Link>
        </p>
      )}
      <Field label="Nouveau mot de passe" name="password" errors={errors.password} hint="8 caractères minimum, avec au moins une lettre et un chiffre.">
        <PasswordInput name="password" required minLength={8} maxLength={128} autoComplete="new-password" invalid={Boolean(errors.password)} />
      </Field>
      <Field label="Confirmation" name="passwordConfirmation" errors={errors.passwordConfirmation}>
        <PasswordInput name="passwordConfirmation" required autoComplete="new-password" invalid={Boolean(errors.passwordConfirmation)} />
      </Field>
      <SubmitButton size="lg" className="w-full" pendingLabel="Enregistrement…">
        <KeyRound size={18} aria-hidden />
        Enregistrer le mot de passe
      </SubmitButton>
    </form>
  );
}
