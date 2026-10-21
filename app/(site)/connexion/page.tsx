import { LogIn } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/site/auth-shell";
import { LoginForm } from "@/components/site/login-form";
import { Notice } from "@/components/site/notice";
import { firstParam } from "@/components/site/params";
import { FormSkeleton } from "@/components/site/skeleton";
import { redirectIfSignedIn } from "@/lib/server/auth";
import { isMailboxEnabled } from "@/lib/server/services/mailbox";
import { safeRedirectPath } from "@/lib/server/url";

export const metadata: Metadata = {
  title: "Connexion",
  description: "Connectez-vous à Spider Sense avec votre email, ou votre alias si vous êtes un super-héros.",
};

export default function LoginPage({ searchParams }: PageProps<"/connexion">) {
  return (
    <AuthShell icon={<LogIn size={26} aria-hidden />} title="Connexion" description="Avec votre adresse email, ou votre alias si vous êtes un super-héros.">
      <Suspense fallback={<FormSkeleton fields={2} />}>
        <LoginContent searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}

// Mirrors db/index.ts: the demo accounts only exist when the demo data is seeded.
function demoDataSeeded(): boolean {
  const flag = process.env.SEED_DEMO_DATA;
  return flag ? flag === "true" : !process.env.DATABASE_URL;
}

async function LoginContent({ searchParams }: Pick<PageProps<"/connexion">, "searchParams">) {
  await redirectIfSignedIn();
  const params = await searchParams;
  const next = safeRedirectPath(firstParam(params.next));
  return (
    <div className="space-y-5">
      {firstParam(params.active) === "1" && (
        <Notice tone="success" title="Votre compte est activé">
          Vous pouvez maintenant vous connecter.
        </Notice>
      )}
      {firstParam(params.reset) === "1" && (
        <Notice tone="success" title="Mot de passe modifié">
          Connectez-vous avec votre nouveau mot de passe.
        </Notice>
      )}
      {next && <Notice tone="info">Connectez-vous pour accéder à cette page.</Notice>}
      <LoginForm next={next} showDemoAccounts={demoDataSeeded()} mailboxHref={isMailboxEnabled() ? "/dev/mails" : null} />
    </div>
  );
}
