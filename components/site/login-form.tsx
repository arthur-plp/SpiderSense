"use client";

import { FlaskConical, LogIn, MailWarning } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { useApiForm } from "@/lib/use-api-form";
import { authLinkClass } from "./auth-shell";
import { PasswordInput } from "./password-input";
import { ResendActivationForm } from "./resend-activation-form";

const DEMO_PASSWORD = "Demo1234!";

const DEMO_ACCOUNTS: { role: string; email: string; alias?: string }[] = [
  { role: "Citoyen", email: "citoyen@spider-sense.test" },
  { role: "Super-héros", email: "spiderman@spider-sense.test", alias: "Spider-Man" },
  { role: "Modérateur", email: "moderateur@spider-sense.test" },
  { role: "Administrateur", email: "admin@spider-sense.test" },
];

/** Login (5.2): email, or alias for approved super-heroes. */
export function LoginForm({
  next,
  showDemoAccounts,
  mailboxHref,
}: {
  next: string | null;
  showDemoAccounts: boolean;
  mailboxHref: string | null;
}) {
  // Back to the protected page that sent here, else the user's own space.
  const [state, formAction] = useApiForm({
    method: "POST",
    path: "/api/auth/login",
    redirectTo: next ?? "{homePath}",
    fullReload: true,
  });
  const identifierRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const unverifiedEmail = state.values?.unverifiedEmail;

  function prefill(identifier: string) {
    if (!identifierRef.current || !passwordRef.current) return;
    identifierRef.current.value = identifier;
    passwordRef.current.value = DEMO_PASSWORD;
    identifierRef.current.focus();
  }

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-5">
        {next && <input type="hidden" name="next" value={next} />}
        <FormMessage state={state} />
        <Field label="Email ou alias de super-héros" name="identifier">
          <Input
            ref={identifierRef}
            name="identifier"
            required
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="vous@exemple.fr ou Spider-Man"
            defaultValue={state.values?.identifier}
          />
        </Field>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="password" className="text-sm font-medium text-slate-200">
              Mot de passe
            </label>
            <Link href="/mot-de-passe-oublie" className="text-xs font-medium text-sky-300 hover:text-sky-200 hover:underline">
              Mot de passe oublié ?
            </Link>
          </div>
          <PasswordInput ref={passwordRef} name="password" required autoComplete="current-password" />
        </div>
        <SubmitButton size="lg" className="w-full" pendingLabel="Connexion…">
          <LogIn size={18} aria-hidden />
          Se connecter
        </SubmitButton>
      </form>

      {unverifiedEmail && (
        <div className="space-y-3 rounded-2xl border border-amber-300/25 bg-amber-300/5 p-4">
          <p className="flex items-start gap-2 text-sm text-amber-100">
            <MailWarning size={16} className="mt-0.5 shrink-0" aria-hidden />
            Le lien d&apos;activation a expiré ou s&apos;est perdu ? Recevez-en un nouveau à {unverifiedEmail}.
          </p>
          <ResendActivationForm key={unverifiedEmail} email={unverifiedEmail} hiddenEmail mailboxHref={mailboxHref} />
        </div>
      )}

      <p className="text-center text-sm text-slate-400">
        Pas encore de compte ?{" "}
        <Link href="/inscription" className={authLinkClass}>
          Créer un compte
        </Link>
      </p>

      {showDemoAccounts && (
        <details className="group rounded-2xl border border-white/10 bg-white/3 text-sm">
          <summary className="flex cursor-pointer list-none items-center gap-2 rounded-2xl px-4 py-3 font-medium text-slate-300 hover:text-white [&::-webkit-details-marker]:hidden">
            <FlaskConical size={16} className="text-brand" aria-hidden />
            Comptes de démonstration
            <span aria-hidden className="ml-auto text-slate-500 transition-transform group-open:rotate-90">
              ›
            </span>
          </summary>
          <div className="space-y-3 border-t border-white/10 px-4 pb-4 pt-3">
            <p className="text-xs text-slate-400">
              Mot de passe commun : <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-slate-200">{DEMO_PASSWORD}</code>
            </p>
            <ul className="space-y-2">
              {DEMO_ACCOUNTS.map(({ role, email, alias }) => (
                <li key={email} className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-200">{role}</p>
                    <p className="truncate font-mono text-xs text-slate-400">
                      {email}
                      {alias && <> · alias « {alias} »</>}
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="secondary" onClick={() => prefill(email)} aria-label={`Remplir avec le compte ${role.toLowerCase()}`}>
                      Utiliser
                    </Button>
                    {alias && (
                      <Button size="sm" variant="ghost" onClick={() => prefill(alias)} aria-label={`Remplir avec l'alias ${alias}`}>
                        Par alias
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </details>
      )}
    </div>
  );
}
