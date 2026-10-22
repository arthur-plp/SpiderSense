"use client";

import { Send } from "lucide-react";
import Link from "next/link";
import { cn } from "@/components/ui/cn";
import { Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { useApiForm } from "@/lib/use-api-form";

/** Anonymous newsletter sign-up (4.2). Disappears once the cookie is set. */
export function NewsletterForm() {
  const [state, formAction] = useApiForm({ method: "POST", path: "/api/newsletter/subscriptions" });
  const error = state.fieldErrors?.email?.[0];
  return (
    <form action={formAction} className="w-full">
      <label htmlFor="newsletter-email" className="sr-only">
        Adresse email pour la newsletter
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          id="newsletter-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="vous@exemple.fr"
          defaultValue={state.values?.email}
          invalid={Boolean(error)}
          aria-describedby="newsletter-help"
          className="sm:flex-1"
        />
        <SubmitButton pendingLabel="Inscription…" className="sm:h-auto">
          <Send size={16} aria-hidden />
          S&apos;inscrire
        </SubmitButton>
      </div>
      <p id="newsletter-help" aria-live="polite" className={cn("mt-2 text-xs", error ? "font-medium text-rose-300" : "text-slate-500")}>
        {error ?? state.message ?? (
          <>
            Un email par mois, désinscription en un clic.{" "}
            <Link href="/confidentialite" className="underline decoration-slate-600 underline-offset-2 hover:text-slate-300">
              Vos données
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
