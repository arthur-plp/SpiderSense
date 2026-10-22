"use client";

import { Field, FormMessage, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { useApiForm } from "@/lib/use-api-form";

export type ContactDefaults = {
  phone: string;
  street: string;
  addressComplement: string | null;
  postalCode: string;
  city: string;
  country: string;
};

/** The only editable profile fields (5.8.3 / 6.1.1): phone and postal address. */
export function ContactForm({ defaults }: { defaults: ContactDefaults }) {
  const [state, action] = useApiForm({ method: "PUT", path: "/api/me/contact" });
  const value = (name: keyof ContactDefaults) => state.values?.[name] ?? defaults[name] ?? "";
  const errors = state.fieldErrors ?? {};
  return (
    <form action={action} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field label="Numéro de portable" name="phone" errors={errors.phone} className="sm:col-span-2">
        <Input name="phone" type="tel" autoComplete="tel" defaultValue={value("phone")} invalid={Boolean(errors.phone)} required />
      </Field>
      <Field label="Rue" name="street" errors={errors.street} className="sm:col-span-2">
        <Input name="street" autoComplete="address-line1" defaultValue={value("street")} invalid={Boolean(errors.street)} required />
      </Field>
      <Field label="Complément d'adresse" name="addressComplement" errors={errors.addressComplement} className="sm:col-span-2">
        <Input name="addressComplement" autoComplete="address-line2" defaultValue={value("addressComplement")} />
      </Field>
      <Field label="Code postal" name="postalCode" errors={errors.postalCode}>
        <Input name="postalCode" autoComplete="postal-code" inputMode="numeric" defaultValue={value("postalCode")} invalid={Boolean(errors.postalCode)} required />
      </Field>
      <Field label="Ville" name="city" errors={errors.city}>
        <Input name="city" autoComplete="address-level2" defaultValue={value("city")} invalid={Boolean(errors.city)} required />
      </Field>
      <Field label="Pays" name="country" errors={errors.country} className="sm:col-span-2">
        <Input name="country" autoComplete="country-name" defaultValue={value("country")} invalid={Boolean(errors.country)} required />
      </Field>
      <div className="flex flex-col gap-3 sm:col-span-2">
        <FormMessage state={state} />
        <SubmitButton className="self-start" pendingLabel="Enregistrement…">Enregistrer</SubmitButton>
      </div>
    </form>
  );
}
