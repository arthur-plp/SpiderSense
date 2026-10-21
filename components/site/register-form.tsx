"use client";

import { Lock, MapPin, UserPlus, UserRound } from "lucide-react";
import Link from "next/link";
import { type ReactNode, useActionState, useEffect, useRef } from "react";
import { Field, FormMessage, Input, Select } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { idleState } from "@/lib/action-state";
import { register } from "@/lib/actions/auth";
import { type Civility, CIVILITY_LABELS } from "@/lib/labels";
import { authLinkClass } from "./auth-shell";
import { PasswordInput } from "./password-input";

const CIVILITIES = Object.entries(CIVILITY_LABELS) as [Civility, string][];

/** Sign-up (5.4): one form for citizens and heroes. Field names match `registerSchema`. */
export function RegisterForm() {
  const [state, formAction] = useActionState(register, idleState);
  const formRef = useRef<HTMLFormElement>(null);
  const values = state.values ?? {};
  const errors = state.fieldErrors ?? {};
  const err = (field: string) => errors[field];

  // Move focus to the first field to fix after a failed submit.
  useEffect(() => {
    if (state.status !== "error") return;
    formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-8" noValidate>
      <FormMessage state={state} />

      <FormSection icon={<UserRound size={18} />} title="Informations personnelles">
        <Field label="Civilité" name="civility" errors={err("civility")}>
          <Select name="civility" required defaultValue={values.civility ?? ""} invalid={Boolean(err("civility"))}>
            <option value="" disabled>
              Choisir…
            </option>
            {CIVILITIES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Date de naissance" name="birthDate" errors={err("birthDate")}>
          <Input name="birthDate" type="date" required autoComplete="bday" defaultValue={values.birthDate} invalid={Boolean(err("birthDate"))} />
        </Field>
        <Field label="Nom" name="lastName" errors={err("lastName")}>
          <Input name="lastName" required maxLength={100} autoComplete="family-name" defaultValue={values.lastName} invalid={Boolean(err("lastName"))} />
        </Field>
        <Field label="Prénom" name="firstName" errors={err("firstName")}>
          <Input name="firstName" required maxLength={100} autoComplete="given-name" defaultValue={values.firstName} invalid={Boolean(err("firstName"))} />
        </Field>
        <Field label="Adresse email" name="email" errors={err("email")} hint="Elle servira d'identifiant de connexion." className="sm:col-span-2">
          <Input
            name="email"
            type="email"
            required
            maxLength={255}
            autoComplete="email"
            placeholder="vous@exemple.fr"
            defaultValue={values.email}
            invalid={Boolean(err("email"))}
          />
        </Field>
      </FormSection>

      <FormSection icon={<MapPin size={18} />} title="Informations complémentaires">
        <Field label="Téléphone mobile" name="phone" errors={err("phone")} hint="Utile aux héros pour vous joindre pendant une intervention." className="sm:col-span-2">
          <Input name="phone" type="tel" required autoComplete="tel" placeholder="06 12 34 56 78" defaultValue={values.phone} invalid={Boolean(err("phone"))} />
        </Field>
        <Field label="Adresse" name="street" errors={err("street")} className="sm:col-span-2">
          <Input name="street" required maxLength={255} autoComplete="address-line1" placeholder="12 rue de Rivoli" defaultValue={values.street} invalid={Boolean(err("street"))} />
        </Field>
        <Field label="Complément d'adresse (facultatif)" name="addressComplement" errors={err("addressComplement")} className="sm:col-span-2">
          <Input
            name="addressComplement"
            maxLength={255}
            autoComplete="address-line2"
            placeholder="Bâtiment, étage, digicode…"
            defaultValue={values.addressComplement}
            invalid={Boolean(err("addressComplement"))}
          />
        </Field>
        <Field label="Code postal" name="postalCode" errors={err("postalCode")}>
          <Input name="postalCode" required maxLength={10} autoComplete="postal-code" inputMode="numeric" defaultValue={values.postalCode} invalid={Boolean(err("postalCode"))} />
        </Field>
        <Field label="Ville" name="city" errors={err("city")}>
          <Input name="city" required maxLength={100} autoComplete="address-level2" defaultValue={values.city} invalid={Boolean(err("city"))} />
        </Field>
        <Field label="Pays" name="country" errors={err("country")} className="sm:col-span-2">
          <Input name="country" required maxLength={100} autoComplete="country-name" defaultValue={values.country ?? "France"} invalid={Boolean(err("country"))} />
        </Field>
      </FormSection>

      <FormSection icon={<Lock size={18} />} title="Sécurité">
        <Field label="Mot de passe" name="password" errors={err("password")} hint="8 caractères minimum, avec au moins une lettre et un chiffre.">
          <PasswordInput name="password" required minLength={8} maxLength={128} autoComplete="new-password" invalid={Boolean(err("password"))} />
        </Field>
        <Field label="Confirmation du mot de passe" name="passwordConfirmation" errors={err("passwordConfirmation")}>
          <PasswordInput name="passwordConfirmation" required autoComplete="new-password" invalid={Boolean(err("passwordConfirmation"))} />
        </Field>
        <div className="sm:col-span-2">
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-white/3 p-4 text-sm text-slate-300">
            <input
              type="checkbox"
              name="acceptTerms"
              required
              defaultChecked={values.acceptTerms === "on"}
              aria-invalid={err("acceptTerms") ? true : undefined}
              aria-describedby={err("acceptTerms") ? "acceptTerms-error" : undefined}
              className="mt-0.5 size-4 shrink-0 accent-sky-400"
            />
            <span>
              J&apos;accepte que mes données soient traitées par Heros-SOS pour gérer mon compte et mes signalements, conformément à la{" "}
              <Link href="/confidentialite" target="_blank" className={authLinkClass}>
                politique de confidentialité
                <span className="sr-only"> (nouvel onglet)</span>
              </Link>
              .
            </span>
          </label>
          {err("acceptTerms") && (
            <p id="acceptTerms-error" className="mt-1.5 text-xs font-medium text-rose-300">
              {err("acceptTerms")?.[0]}
            </p>
          )}
        </div>
      </FormSection>

      <div className="space-y-4">
        <SubmitButton size="lg" className="w-full" pendingLabel="Création du compte…">
          <UserPlus size={18} aria-hidden />
          Créer mon compte
        </SubmitButton>
        <p className="text-center text-sm text-slate-400">
          Déjà inscrit(e) ?{" "}
          <Link href="/connexion" className={authLinkClass}>
            Se connecter
          </Link>
        </p>
      </div>
    </form>
  );
}

function FormSection({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-4 flex items-center gap-2.5 text-base font-semibold text-white">
        <span aria-hidden className="grid size-8 place-items-center rounded-xl bg-sky-400/10 text-sky-300 ring-1 ring-sky-300/20">
          {icon}
        </span>
        {title}
      </legend>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}
