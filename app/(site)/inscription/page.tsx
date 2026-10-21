import { ShieldCheck, UserPlus } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/site/auth-shell";
import { Notice } from "@/components/site/notice";
import { RegisterForm } from "@/components/site/register-form";
import { FormSkeleton } from "@/components/site/skeleton";
import { redirectIfSignedIn } from "@/lib/server/auth";

export const metadata: Metadata = {
  title: "Créer un compte",
  description: "Inscrivez-vous sur Heros-SOS pour signaler un incident ou, si vous êtes un super-héros, intervenir.",
};

export default function RegisterPage() {
  return (
    <AuthShell
      wide
      icon={<UserPlus size={26} aria-hidden />}
      title="Créer un compte"
      description="Un seul formulaire pour les citoyens comme pour les super-héros. Un email d'activation vous sera envoyé."
    >
      <Notice tone="info" title="Vous êtes un super-héros ?" className="mb-8">
        <span className="inline-flex items-start gap-1.5">
          <ShieldCheck size={15} className="mt-0.5 shrink-0" aria-hidden />
          Inscrivez-vous ici comme tout le monde, puis, une fois votre compte activé, demandez votre statut de héros depuis « Mon compte ».
          Un modérateur validera votre profil.
        </span>
      </Notice>
      <Suspense fallback={<FormSkeleton fields={8} />}>
        <RegisterContent />
      </Suspense>
    </AuthShell>
  );
}

async function RegisterContent() {
  await redirectIfSignedIn();
  return <RegisterForm />;
}
