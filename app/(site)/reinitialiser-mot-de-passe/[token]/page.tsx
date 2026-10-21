import { KeyRound, RotateCcw } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/site/auth-shell";
import { Notice } from "@/components/site/notice";
import { ResetPasswordForm } from "@/components/site/reset-password-form";
import { FormSkeleton } from "@/components/site/skeleton";
import { LinkButton } from "@/components/ui/button";
import { completePasswordReset } from "@/lib/actions/auth";
import { isUserTokenValid } from "@/lib/server/tokens";

export const metadata: Metadata = { title: "Nouveau mot de passe", robots: { index: false } };

export default function ResetPasswordPage({ params }: PageProps<"/reinitialiser-mot-de-passe/[token]">) {
  return (
    <AuthShell icon={<KeyRound size={26} aria-hidden />} title="Nouveau mot de passe" description="Choisissez un mot de passe que vous n'utilisez nulle part ailleurs.">
      <Suspense fallback={<FormSkeleton fields={2} />}>
        <ResetPasswordContent params={params} />
      </Suspense>
    </AuthShell>
  );
}

async function ResetPasswordContent({ params }: Pick<PageProps<"/reinitialiser-mot-de-passe/[token]">, "params">) {
  const { token } = await params;
  if (!(await isUserTokenValid(token, "PASSWORD_RESET"))) {
    return (
      <div className="space-y-5">
        <Notice tone="error" title="Lien invalide ou expiré">
          Ce lien a déjà été utilisé ou a dépassé sa durée de validité d&apos;une heure.
        </Notice>
        <LinkButton href="/mot-de-passe-oublie" size="lg" className="w-full">
          <RotateCcw size={18} aria-hidden />
          Demander un nouveau lien
        </LinkButton>
      </div>
    );
  }
  return <ResetPasswordForm action={completePasswordReset.bind(null, token)} />;
}
