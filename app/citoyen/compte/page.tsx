import { LogOut } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AvatarForm } from "@/components/account/avatar-form";
import { ContactForm } from "@/components/account/contact-form";
import { EmailChangeForm } from "@/components/account/email-change-form";
import { HeroApplication } from "@/components/account/hero-application";
import { NewsletterSettings } from "@/components/account/newsletter-settings";
import { PasswordForm } from "@/components/account/password-form";
import { ProfileDetails } from "@/components/account/profile-details";
import { MobilePage, MobilePageSkeleton } from "@/components/citizen/mobile-page";
import { LinkButton } from "@/components/ui/button";
import { Panel, SectionTitle } from "@/components/ui/panel";
import { SubmitButton } from "@/components/ui/submit-button";
import { logout } from "@/lib/actions/auth";
import { requireUser } from "@/lib/server/auth";
import { getAccount } from "@/lib/server/services/account";

export const metadata: Metadata = { title: "Mon compte" };

export default function AccountPage() {
  return (
    <Suspense fallback={<MobilePageSkeleton title="Mon compte" />}>
      <Account />
    </Suspense>
  );
}

async function Account() {
  const user = await requireUser();
  const account = await getAccount(user.id);
  if (!account) notFound();
  return (
    <MobilePage title="Mon compte">
      <div className="flex flex-col gap-4">
        <Panel className="p-4">
          <AvatarForm avatarUrl={account.avatarUrl} label={`${account.firstName} ${account.lastName}`} />
        </Panel>
        {(user.isHero || user.isStaff) && (
          <LinkButton href={user.isStaff ? "/admin" : "/heros"} variant="glass">
            {user.isStaff ? "Ouvrir le dashboard de modération" : "Ouvrir mon espace professionnel"}
          </LinkButton>
        )}
        <Panel className="p-4">
          <SectionTitle>Mon profil</SectionTitle>
          <ProfileDetails profile={{ ...account, alias: account.hero?.status === "APPROVED" ? account.hero.alias : null }} />
        </Panel>
        <Panel className="p-4">
          <SectionTitle>Coordonnées</SectionTitle>
          <ContactForm defaults={account} />
        </Panel>
        <Panel className="p-4">
          <SectionTitle>Adresse email</SectionTitle>
          <EmailChangeForm currentEmail={account.email} pending={account.pendingEmail} />
        </Panel>
        <Panel className="p-4">
          <SectionTitle>Newsletter</SectionTitle>
          <NewsletterSettings subscription={account.newsletter} />
        </Panel>
        <Panel className="p-4">
          <SectionTitle>Mot de passe</SectionTitle>
          <PasswordForm />
        </Panel>
        {!user.isStaff && (
          <Panel className="p-4">
            <SectionTitle>Statut de super-héros</SectionTitle>
            <HeroApplication application={account.hero ? { alias: account.hero.alias, status: account.hero.status, powers: account.hero.powers, bio: account.hero.bio } : null} />
          </Panel>
        )}
        <form action={logout}>
          <SubmitButton variant="secondary" className="w-full">
            <LogOut className="size-4" aria-hidden /> Se déconnecter
          </SubmitButton>
        </form>
      </div>
    </MobilePage>
  );
}
