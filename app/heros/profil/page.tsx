import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AvatarForm } from "@/components/account/avatar-form";
import { ContactForm } from "@/components/account/contact-form";
import { EmailChangeForm } from "@/components/account/email-change-form";
import { HeroProfileForm } from "@/components/account/hero-profile-form";
import { PasswordForm } from "@/components/account/password-form";
import { ProfileDetails } from "@/components/account/profile-details";
import { HeroPage } from "@/components/hero/hero-page";
import { PageHeader, Panel, SectionTitle } from "@/components/ui/panel";
import { requireHero } from "@/lib/server/auth";
import { getAccount } from "@/lib/server/services/account";

export const metadata: Metadata = { title: "Profil" };

export default async function HeroProfilePage() {
  const user = await requireHero();
  const account = await getAccount(user.id);
  if (!account) notFound();
  return (
    <HeroPage>
      <PageHeader eyebrow="Espace professionnel" title="Mon profil" description="Seuls le téléphone, l'adresse, la photo et l'email (après validation) sont modifiables." />
      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <div className="flex flex-col gap-4">
          <Panel className="p-5">
            <SectionTitle>Photo de profil</SectionTitle>
            <AvatarForm avatarUrl={account.avatarUrl} label={account.hero?.alias ?? account.firstName} />
          </Panel>
          <Panel className="p-5">
            <SectionTitle>Informations</SectionTitle>
            <ProfileDetails profile={{ ...account, alias: account.hero?.alias ?? null }} />
          </Panel>
          <Panel className="p-5">
            <SectionTitle>Profil de super-héros</SectionTitle>
            <HeroProfileForm bio={account.hero?.bio ?? null} powers={account.hero?.powers ?? []} />
          </Panel>
        </div>
        <div className="flex flex-col gap-4">
          <Panel className="p-5">
            <SectionTitle>Coordonnées</SectionTitle>
            <ContactForm defaults={account} />
          </Panel>
          <Panel className="p-5">
            <SectionTitle>Adresse email</SectionTitle>
            <EmailChangeForm currentEmail={account.email} pending={account.pendingEmail} />
          </Panel>
          <Panel className="p-5">
            <SectionTitle>Mot de passe</SectionTitle>
            <PasswordForm />
          </Panel>
        </div>
      </div>
    </HeroPage>
  );
}
