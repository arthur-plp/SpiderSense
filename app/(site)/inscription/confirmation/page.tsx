import { Inbox, MailCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthShell, authLinkClass } from "@/components/site/auth-shell";
import { firstParam } from "@/components/site/params";
import { ResendActivationForm } from "@/components/site/resend-activation-form";
import { FormSkeleton } from "@/components/site/skeleton";
import { LinkButton } from "@/components/ui/button";
import { getMailboxHref } from "@/lib/server/services/mailbox";

export const metadata: Metadata = { title: "Vérifiez votre boîte mail", robots: { index: false } };

export default function RegistrationConfirmationPage({ searchParams }: PageProps<"/inscription/confirmation">) {
  return (
    <AuthShell
      icon={<MailCheck size={26} aria-hidden />}
      title="Vérifiez votre boîte mail"
      description="Votre compte est créé. Il ne reste qu'à l'activer."
      footer={
        <>
          Compte déjà activé ?{" "}
          <Link href="/connexion" className={authLinkClass}>
            Se connecter
          </Link>
        </>
      }
    >
      <Suspense fallback={<FormSkeleton fields={1} />}>
        <ConfirmationContent searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}

async function ConfirmationContent({ searchParams }: Pick<PageProps<"/inscription/confirmation">, "searchParams">) {
  const raw = firstParam((await searchParams).email);
  const email = raw && raw.length <= 255 && raw.includes("@") ? raw : null;
  const mailboxHref = getMailboxHref(email);

  return (
    <div className="space-y-6">
      <p className="text-sm leading-relaxed text-slate-300">
        Nous avons envoyé un lien d&apos;activation à {email ? <strong className="break-all text-white">{email}</strong> : "votre adresse email"}.
        Cliquez dessus pour activer votre compte : il reste valable 7 jours. Pensez à regarder dans les courriers indésirables.
      </p>
      {mailboxHref && (
        <LinkButton href={mailboxHref} variant="glass" size="lg" className="w-full">
          <Inbox size={18} aria-hidden />
          Ouvrir la boîte mail de démo
        </LinkButton>
      )}
      <div className="border-t border-white/10 pt-5">
        <h2 className="mb-3 text-sm font-semibold text-white">Vous n&apos;avez rien reçu ?</h2>
        <ResendActivationForm email={email} mailboxHref={mailboxHref} />
      </div>
    </div>
  );
}
