import { LayoutDashboard, UserPlus } from "lucide-react";
import { type ButtonSize, type ButtonVariant, LinkButton } from "@/components/ui/button";
import { getCurrentUser, homePathFor } from "@/lib/server/auth";

type CtaProps = { variant?: ButtonVariant; size?: ButtonSize; className?: string };

/** Static "Créer un compte" button: the Suspense fallback of AccountCta. */
export function SignUpCta({ variant = "glass", size = "lg", className }: CtaProps) {
  return (
    <LinkButton href="/inscription" variant={variant} size={size} className={className}>
      <UserPlus size={18} aria-hidden />
      Créer un compte
    </LinkButton>
  );
}

/** Sign-up for visitors, "Mon espace" for signed-in users. Reads the session: render inside <Suspense>. */
export async function AccountCta(props: CtaProps) {
  const user = await getCurrentUser();
  if (!user) return <SignUpCta {...props} />;
  const { variant = "glass", size = "lg", className } = props;
  return (
    <LinkButton href={homePathFor(user)} variant={variant} size={size} className={className}>
      <LayoutDashboard size={18} aria-hidden />
      Ouvrir mon espace
    </LinkButton>
  );
}
