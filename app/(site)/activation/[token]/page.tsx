import { BadgeCheck } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/site/auth-shell";
import { ConfirmActionForm } from "@/components/site/confirm-action-form";
import { ResendActivationForm } from "@/components/site/resend-activation-form";
import { FormSkeleton } from "@/components/site/skeleton";
import { activateAccount } from "@/lib/actions/auth";
import { isMailboxEnabled } from "@/lib/server/services/mailbox";

export const metadata: Metadata = { title: "Activation du compte", robots: { index: false } };

export default function ActivationPage({ params }: PageProps<"/activation/[token]">) {
  return (
    <AuthShell
      icon={<BadgeCheck size={26} aria-hidden />}
      title="Activez votre compte"
      description="Dernière étape : confirmez l'activation pour pouvoir vous connecter."
    >
      <Suspense fallback={<FormSkeleton fields={0} />}>
        <ActivationContent params={params} />
      </Suspense>
    </AuthShell>
  );
}

async function ActivationContent({ params }: Pick<PageProps<"/activation/[token]">, "params">) {
  const { token } = await params;
  return (
    <ConfirmActionForm
      action={activateAccount.bind(null, token)}
      label="Activer mon compte"
      pendingLabel="Activation…"
      icon={<BadgeCheck size={18} aria-hidden />}
      errorContent={
        <div className="space-y-3 border-t border-white/10 pt-5">
          <h2 className="text-sm font-semibold text-white">Recevoir un nouveau lien</h2>
          <ResendActivationForm mailboxHref={isMailboxEnabled() ? "/dev/mails" : null} />
        </div>
      }
    />
  );
}
