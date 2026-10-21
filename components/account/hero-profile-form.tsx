"use client";

import { useActionState } from "react";
import { Field, FormMessage, Input, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { idleState } from "@/lib/action-state";
import { updateHeroProfileAction } from "@/lib/actions/account";

/** Hero personalisation: powers and presentation shown to citizens. */
export function HeroProfileForm({ bio, powers }: { bio: string | null; powers: string[] }) {
  const [state, action] = useActionState(updateHeroProfileAction, idleState);
  const errors = state.fieldErrors ?? {};
  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="Pouvoirs" name="powers" errors={errors.powers} hint="Séparés par des virgules (8 maximum).">
        <Input name="powers" defaultValue={state.values?.powers ?? powers.join(", ")} invalid={Boolean(errors.powers)} required />
      </Field>
      <Field label="Présentation" name="bio" errors={errors.bio}>
        <Textarea name="bio" rows={4} maxLength={1000} defaultValue={state.values?.bio ?? bio ?? ""} />
      </Field>
      <FormMessage state={state} />
      <SubmitButton className="self-start" pendingLabel="Enregistrement…">Mettre à jour mon profil héros</SubmitButton>
    </form>
  );
}
