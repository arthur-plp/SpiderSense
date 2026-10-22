"use client";

import { Clock, ShieldCheck, ShieldX } from "lucide-react";
import Link from "next/link";
import { Field, FormMessage, Input, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ReviewStatus } from "@/lib/labels";
import { useApiForm } from "@/lib/use-api-form";

type Application = { alias: string; status: ReviewStatus; powers: string[]; bio: string | null } | null;

/** Becoming a hero: same sign-up form for everyone, then a request reviewed by moderators. */
export function HeroApplication({ application }: { application: Application }) {
  const [state, action] = useApiForm({ method: "POST", path: "/api/me/hero-application" });
  if (application?.status === "APPROVED") {
    return (
      <p className="flex items-center gap-2 text-sm text-emerald-200">
        <ShieldCheck className="size-4" aria-hidden /> Vous êtes reconnu comme super-héros ({application.alias}).{" "}
        <Link href="/heros" className="font-semibold underline">Espace professionnel</Link>
      </p>
    );
  }
  if (application?.status === "PENDING" || state.status === "success") {
    return (
      <p className="flex items-start gap-2 text-sm text-amber-100">
        <Clock className="mt-0.5 size-4 shrink-0" aria-hidden />
        Votre demande{application ? ` (« ${application.alias} »)` : ""} est en cours d&apos;examen par l&apos;administration. Vous serez prévenu par email.
      </p>
    );
  }
  const errors = state.fieldErrors ?? {};
  return (
    <form action={action} className="flex flex-col gap-3">
      {application?.status === "REJECTED" && (
        <p className="flex items-center gap-2 text-sm text-rose-200">
          <ShieldX className="size-4" aria-hidden /> Votre précédente demande a été refusée. Vous pouvez compléter votre profil et la renouveler.
        </p>
      )}
      <p className="text-sm text-slate-400">Vous avez des super-pouvoirs ? Demandez à être reconnu comme super-héros : l&apos;administration vérifiera votre identité.</p>
      <Field label="Nom de super-héros" name="alias" errors={errors.alias}>
        <Input name="alias" maxLength={100} defaultValue={state.values?.alias ?? application?.alias} invalid={Boolean(errors.alias)} required />
      </Field>
      <Field label="Pouvoirs" name="powers" errors={errors.powers} hint="Séparés par des virgules.">
        <Input name="powers" defaultValue={state.values?.powers ?? application?.powers.join(", ")} invalid={Boolean(errors.powers)} required />
      </Field>
      <Field label="Présentation" name="bio" errors={errors.bio}>
        <Textarea name="bio" rows={3} maxLength={1000} defaultValue={state.values?.bio ?? application?.bio ?? ""} />
      </Field>
      <FormMessage state={state} />
      <SubmitButton variant="brand" className="self-start" pendingLabel="Envoi…">Envoyer ma demande</SubmitButton>
    </form>
  );
}
