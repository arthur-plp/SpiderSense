import { House, MailX } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/site/auth-shell";
import { ConfirmActionForm } from "@/components/site/confirm-action-form";
import { FormSkeleton } from "@/components/site/skeleton";
import { LinkButton } from "@/components/ui/button";

export const metadata: Metadata = { title: "Désinscription de la newsletter", robots: { index: false } };

export default function UnsubscribePage({ params }: PageProps<"/newsletter/desinscription/[token]">) {
  return (
    <AuthShell
      icon={<MailX size={26} aria-hidden />}
      title="Se désinscrire de la newsletter"
      description="Confirmez pour ne plus recevoir nos emails : votre adresse sera aussitôt supprimée de nos fichiers."
    >
      <Suspense fallback={<FormSkeleton fields={0} />}>
        <UnsubscribeContent params={params} />
      </Suspense>
    </AuthShell>
  );
}

async function UnsubscribeContent({ params }: Pick<PageProps<"/newsletter/desinscription/[token]">, "params">) {
  const { token } = await params;
  const home = (
    <LinkButton href="/" variant="secondary" size="lg" className="w-full">
      <House size={18} aria-hidden />
      Retour à l&apos;accueil
    </LinkButton>
  );
  return (
    <ConfirmActionForm
      endpoint={{ method: "POST", path: "/api/newsletter/unsubscribe", body: { token } }}
      label="Confirmer la désinscription"
      pendingLabel="Désinscription…"
      variant="danger"
      icon={<MailX size={18} aria-hidden />}
      successContent={home}
      errorContent={home}
    />
  );
}
