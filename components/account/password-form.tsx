"use client";

import { Field, FormMessage, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { useApiForm } from "@/lib/use-api-form";

export function PasswordForm() {
  const [state, action] = useApiForm({ method: "PUT", path: "/api/me/password" });
  const errors = state.fieldErrors ?? {};
  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="Mot de passe actuel" name="currentPassword" errors={errors.currentPassword}>
        <Input name="currentPassword" type="password" autoComplete="current-password" invalid={Boolean(errors.currentPassword)} required />
      </Field>
      <Field label="Nouveau mot de passe" name="password" errors={errors.password} hint="8 caractères minimum, avec au moins une lettre et un chiffre.">
        <Input name="password" type="password" autoComplete="new-password" minLength={8} invalid={Boolean(errors.password)} required />
      </Field>
      <Field label="Confirmation" name="passwordConfirmation" errors={errors.passwordConfirmation}>
        <Input name="passwordConfirmation" type="password" autoComplete="new-password" invalid={Boolean(errors.passwordConfirmation)} required />
      </Field>
      <FormMessage state={state} />
      <SubmitButton className="self-start" pendingLabel="Modification…">Modifier le mot de passe</SubmitButton>
    </form>
  );
}
