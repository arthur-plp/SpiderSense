import { z } from "zod";

// French default messages, for fields without a custom one (e.g. missing in a JSON body).
z.config(z.locales.fr());

// Form fields arrive as strings; these helpers turn "" into null and trim.

export const requiredText = (label: string, max = 255) =>
  z
    .string({ error: `${label} est obligatoire.` })
    .trim()
    .min(1, `${label} est obligatoire.`)
    .max(max, `${label} : ${max} caractères maximum.`);

export const optionalText = (max = 255) =>
  z
    .string()
    .trim()
    .max(max, `${max} caractères maximum.`)
    .optional()
    .transform((value) => (value ? value : null));

export const optionalNumber = (min: number, max: number) =>
  z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? null : Number(value)),
    z.number().min(min).max(max).nullable(),
  );

export const emailSchema = z.email("Adresse email invalide.").trim().toLowerCase().max(255);

export const passwordSchema = z
  .string()
  .min(8, "8 caractères minimum.")
  .max(128, "128 caractères maximum.")
  .regex(/[A-Za-z]/, "Au moins une lettre.")
  .regex(/\d/, "Au moins un chiffre.");

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9 .()-]{8,20}$/, "Numéro de téléphone invalide.");

export const postalCodeSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9 -]{3,10}$/, "Code postal invalide.");

export const contactSchema = z.object({
  phone: phoneSchema,
  street: requiredText("La rue"),
  addressComplement: optionalText(),
  postalCode: postalCodeSchema,
  city: requiredText("La ville", 100),
  country: requiredText("Le pays", 100),
});

export const civilitySchema = z.enum(["MR", "MRS", "OTHER"], { error: "Choisissez une civilité." });

const birthDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date de naissance invalide.")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    const age = (Date.now() - date.getTime()) / (365.25 * 24 * 3600 * 1000);
    return age >= 13 && age <= 130;
  }, "Vous devez avoir au moins 13 ans.");

export const registerSchema = contactSchema
  .extend({
    civility: civilitySchema,
    firstName: requiredText("Le prénom", 100),
    lastName: requiredText("Le nom", 100),
    birthDate: birthDateSchema,
    email: emailSchema,
    password: passwordSchema,
    passwordConfirmation: z.string(),
    // "on" from the form checkbox, "true" from a JSON client.
    acceptTerms: z.enum(["on", "true"], { error: "Vous devez accepter le traitement de vos données." }),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    path: ["passwordConfirmation"],
    message: "Les mots de passe ne correspondent pas.",
  });

export const newPasswordSchema = z
  .object({ password: passwordSchema, passwordConfirmation: z.string() })
  .refine((data) => data.password === data.passwordConfirmation, {
    path: ["passwordConfirmation"],
    message: "Les mots de passe ne correspondent pas.",
  });

export const prioritySchema = z.enum(["HIGH", "NORMAL", "LOW"], { error: "Priorité invalide." });

/** Converts a datetime-local value typed in the browser's time zone. */
export function parseLocalDateTime(value: string, timezoneOffsetMinutes: number): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day, hours, minutes] = match.map(Number);
  const utc = Date.UTC(year, month - 1, day, hours, minutes) + timezoneOffsetMinutes * 60_000;
  return new Date(utc);
}

export const incidentSchema = z
  .object({
    typeId: z.coerce.number({ error: "Choisissez un type d'incident." }).int().positive("Choisissez un type d'incident."),
    description: z
      .string()
      .trim()
      .min(10, "Décrivez la situation en quelques mots (10 caractères minimum).")
      .max(2000, "2000 caractères maximum."),
    occurredAt: z.string().optional(),
    timezoneOffset: z.coerce.number().int().min(-840).max(840).default(0),
    peopleInvolved: z.coerce.number().int().min(0, "Nombre invalide.").max(10_000, "Nombre invalide.").default(1),
    street: optionalText(),
    postalCode: optionalText(10),
    city: requiredText("La ville", 100),
    country: z.string().trim().max(100).optional().transform((value) => value || "France"),
    latitude: optionalNumber(-90, 90),
    longitude: optionalNumber(-180, 180),
    reportedVillainName: optionalText(100),
  })
  .transform(({ occurredAt, timezoneOffset, ...data }, context) => {
    let date = new Date();
    if (occurredAt) {
      const parsed = parseLocalDateTime(occurredAt, timezoneOffset);
      if (!parsed || parsed.getTime() > Date.now() + 5 * 60_000) {
        context.addIssue({ code: "custom", path: ["occurredAt"], message: "La date ne peut pas être dans le futur." });
        return z.NEVER;
      }
      date = parsed;
    }
    return { ...data, occurredAt: date };
  });

/** Collects zod issues as { field: [messages] } for useActionState forms. */
export function fieldErrorsOf(error: z.ZodError): Record<string, string[] | undefined> {
  return z.flattenError(error).fieldErrors as Record<string, string[] | undefined>;
}

/** Splits "Vol, Force surhumaine" into a clean list of powers. */
export function parsePowers(value: unknown): string[] {
  if (typeof value !== "string") return [];
  return [...new Set(value.split(/[,\n]/).map((power) => power.trim()).filter(Boolean))].slice(0, 8);
}
