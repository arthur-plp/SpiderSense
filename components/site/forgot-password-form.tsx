"use client";

import { ArrowLeft, Inbox, Send } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import { LinkButton } from "@/components/ui/button";
import { Field, FormMessage, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { idleState } from "@/lib/action-state";
import { requestPasswordReset } from "@/lib/actions/auth";
import { authLinkClass } from "./auth-shell";
import { Notice } from "./notice";

/** Forgot password (5.3): only an email; same answer whether the account exists or not. */
export function ForgotPasswordForm({ mailboxHref }: { mailboxHref: string | null }) {
  const [state, formAction] = useActionState(requestPasswordReset, idleState);

  if (state.status === "success") {
    return (
      <div className="space-y-5">
        <Notice tone="success" title="Demande envoyée">
          {state.message} Le lien est valable une heure.
        </Notice>
        <div className="flex flex-col gap-2 sm:flex-row">
          {mailboxHref && (
            <LinkButton href={mailboxHref} variant="glass" className="flex-1">
              <Inbox size={16} aria-hidden />
              Ouvrir la boîte mail de démo
            </LinkButton>
          )}
          <LinkButton href="/connexion" variant="secondary" className="flex-1">
            <ArrowLeft size={16} aria-hidden />
            Retour à la connexion
          </LinkButton>
        </div>
      </div>
    );
  }

  const error = state.fieldErrors?.email;
  return (
    <form action={formAction} className="space-y-5" noValidate>
      <FormMessage state={state} />
      <Field label="Adresse email" name="email" errors={error}>
        <Input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="vous@exemple.fr"
          defaultValue={state.values?.email}
          invalid={Boolean(error)}
        />
      </Field>
      <SubmitButton size="lg" className="w-full" pendingLabel="Envoi en cours…">
        <Send size={18} aria-hidden />
        Recevoir un lien de réinitialisation
      </SubmitButton>
      <p className="text-center text-sm text-slate-400">
        Vous vous en souvenez ?{" "}
        <Link href="/connexion" className={authLinkClass}>
          Se connecter
        </Link>
      </p>
    </form>
  );
}
