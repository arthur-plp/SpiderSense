"use server";

import { and, eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { heroProfiles, users } from "@/db/schema";
import { type ActionState, formValues } from "@/lib/action-state";
import { logActivity } from "@/lib/server/activity";
import { homePathFor } from "@/lib/server/auth";
import { db, isUniqueViolation } from "@/lib/server/db";
import { getStaffEmails, mailTemplates, queueMails, toMany } from "@/lib/server/mail";
import { hashPassword, verifyPassword } from "@/lib/server/password";
import { resetPassword } from "@/lib/server/services/account";
import { linkSubscriptionToUser } from "@/lib/server/services/newsletter";
import { createSession, destroySession } from "@/lib/server/session";
import { consumeUserToken, createUserToken } from "@/lib/server/tokens";
import { getBaseUrl, safeRedirectPath } from "@/lib/server/url";
import { emailSchema, fieldErrorsOf, newPasswordSchema, registerSchema } from "@/lib/validation";

const PASSWORD_FIELDS = ["password", "passwordConfirmation"];

export async function register(_: ActionState, formData: FormData): Promise<ActionState> {
  const values = formValues(formData, PASSWORD_FIELDS);
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "Certains champs sont à corriger.", fieldErrors: fieldErrorsOf(parsed.error), values };
  }
  const { password, passwordConfirmation: _confirmation, acceptTerms: _terms, ...profile } = parsed.data;
  const database = await db();
  let userId: string;
  try {
    const [created] = await database
      .insert(users)
      .values({ ...profile, passwordHash: await hashPassword(password), role: "CITIZEN" })
      .returning({ id: users.id });
    userId = created.id;
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { status: "error", fieldErrors: { email: ["Un compte existe déjà avec cette adresse email."] }, values };
    }
    throw error;
  }

  const [token, baseUrl, staff] = await Promise.all([
    createUserToken(userId, "ACCOUNT_ACTIVATION"),
    getBaseUrl(),
    getStaffEmails(),
  ]);
  await linkSubscriptionToUser(userId, profile.email);
  await logActivity({ actorId: userId, action: "user.register", entityType: "user", entityId: userId });
  queueMails([
    { to: profile.email, ...mailTemplates.activation(profile.firstName, `${baseUrl}/activation/${token}`) },
    ...toMany(staff, mailTemplates.moderatorsNewUser(profile, `${baseUrl}/admin/utilisateurs/${userId}`)),
  ]);
  redirect(`/inscription/confirmation?email=${encodeURIComponent(profile.email)}`);
}

/** Activation runs on a button press, not on page load: mail scanners open links. */
export async function activateAccount(token: string): Promise<ActionState> {
  const userId = await consumeUserToken(token, "ACCOUNT_ACTIVATION");
  if (!userId) {
    return { status: "error", message: "Ce lien d'activation est invalide ou a expiré." };
  }
  const database = await db();
  await database
    .update(users)
    .set({ emailVerifiedAt: sql`coalesce(${users.emailVerifiedAt}, now())` })
    .where(eq(users.id, userId));
  await logActivity({ actorId: userId, action: "user.activate", entityType: "user", entityId: userId });
  redirect("/connexion?active=1");
}

export async function login(_: ActionState, formData: FormData): Promise<ActionState> {
  const identifier = String(formData.get("identifier") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const values = { identifier };
  if (!identifier || !password) {
    return { status: "error", message: "Renseignez votre identifiant et votre mot de passe.", values };
  }

  const database = await db();
  // Email for everyone, alias for approved heroes only (5.2).
  const byEmail = identifier.includes("@");
  const [user] = await database
    .select({
      id: users.id,
      email: users.email,
      passwordHash: users.passwordHash,
      role: users.role,
      emailVerifiedAt: users.emailVerifiedAt,
      disabledAt: users.disabledAt,
      heroStatus: heroProfiles.status,
    })
    .from(users)
    .leftJoin(heroProfiles, eq(heroProfiles.userId, users.id))
    .where(
      byEmail
        ? sql`lower(${users.email}) = lower(${identifier})`
        : and(sql`lower(${heroProfiles.alias}) = lower(${identifier})`, eq(heroProfiles.status, "APPROVED")),
    );

  const invalid: ActionState = { status: "error", message: "Identifiant ou mot de passe incorrect.", values };
  if (!user) {
    // Same cost as a real check, so response time doesn't reveal accounts.
    await verifyPassword(password, "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAA");
    return invalid;
  }
  if (!(await verifyPassword(password, user.passwordHash))) return invalid;
  if (user.disabledAt) {
    return { status: "error", message: "Ce compte a été désactivé par la modération.", values };
  }
  if (!user.emailVerifiedAt) {
    return {
      status: "error",
      message: "Votre compte n'est pas encore activé : cliquez sur le lien reçu par email.",
      values: { ...values, unverifiedEmail: user.email },
    };
  }

  await createSession(user.id);
  await linkSubscriptionToUser(user.id, user.email);
  await logActivity({ actorId: user.id, action: "user.login", entityType: "user", entityId: user.id });

  const isHero = user.role === "HERO" && user.heroStatus === "APPROVED";
  const isStaff = user.role === "MODERATOR" || user.role === "ADMIN";
  redirect(safeRedirectPath(formData.get("next")) ?? homePathFor({ isHero, isStaff }));
}

export async function resendActivation(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (parsed.success) {
    const database = await db();
    const [user] = await database
      .select({ id: users.id, firstName: users.firstName, emailVerifiedAt: users.emailVerifiedAt })
      .from(users)
      .where(sql`lower(${users.email}) = lower(${parsed.data})`);
    if (user && !user.emailVerifiedAt) {
      const [token, baseUrl] = await Promise.all([createUserToken(user.id, "ACCOUNT_ACTIVATION"), getBaseUrl()]);
      queueMails([{ to: parsed.data, ...mailTemplates.activation(user.firstName, `${baseUrl}/activation/${token}`) }]);
    }
  }
  return { status: "success", message: "Si un compte non activé correspond, un nouveau lien vient d'être envoyé." };
}

export async function requestPasswordReset(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) {
    return { status: "error", fieldErrors: { email: ["Adresse email invalide."] }, values: formValues(formData) };
  }
  const database = await db();
  const [user] = await database
    .select({ id: users.id, firstName: users.firstName, disabledAt: users.disabledAt })
    .from(users)
    .where(sql`lower(${users.email}) = lower(${parsed.data})`);
  if (user && !user.disabledAt) {
    const [token, baseUrl] = await Promise.all([createUserToken(user.id, "PASSWORD_RESET"), getBaseUrl()]);
    queueMails([
      { to: parsed.data, ...mailTemplates.passwordReset(user.firstName, `${baseUrl}/reinitialiser-mot-de-passe/${token}`) },
    ]);
  }
  // Same answer whether the account exists or not.
  return {
    status: "success",
    message: "Si un compte existe avec cette adresse, vous allez recevoir un lien de réinitialisation.",
  };
}

export async function completePasswordReset(token: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = newPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrorsOf(parsed.error) };
  }
  const userId = await consumeUserToken(token, "PASSWORD_RESET");
  if (!userId) {
    return { status: "error", message: "Ce lien a expiré ou a déjà été utilisé. Faites une nouvelle demande." };
  }
  await resetPassword(userId, parsed.data.password);
  redirect("/connexion?reset=1");
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/");
}
