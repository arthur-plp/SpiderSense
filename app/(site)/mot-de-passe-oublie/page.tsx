import { KeyRound } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthShell } from "@/components/site/auth-shell";
import { ForgotPasswordForm } from "@/components/site/forgot-password-form";
import { accountPathFor } from "@/components/site/routes";
import { FormSkeleton } from "@/components/site/skeleton";
import { getCurrentUser } from "@/lib/server/auth";
import { isMailboxEnabled } from "@/lib/server/services/mailbox";

export const metadata: Metadata = { title: "Mot de passe oublié" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      icon={<KeyRound size={26} aria-hidden />}
      title="Mot de passe oublié"
      description="Indiquez l'adresse email de votre compte : nous vous enverrons un lien pour choisir un nouveau mot de passe."
    >
      <Suspense fallback={<FormSkeleton fields={1} />}>
        <ForgotPasswordContent />
      </Suspense>
    </AuthShell>
  );
}

/** Visitors only (5.3): signed-in users change their password from their account page. */
async function ForgotPasswordContent() {
  const user = await getCurrentUser();
  if (user) redirect(accountPathFor(user));
  return <ForgotPasswordForm mailboxHref={isMailboxEnabled() ? "/dev/mails" : null} />;
}
