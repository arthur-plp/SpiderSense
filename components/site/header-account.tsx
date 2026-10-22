import { LayoutDashboard, LogIn, LogOut, UserPlus } from "lucide-react";
import { ApiForm } from "@/components/ui/api-form";
import { Avatar } from "@/components/ui/avatar";
import { LinkButton } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { SubmitButton } from "@/components/ui/submit-button";
import { LOGOUT_ENDPOINT } from "@/lib/api-client";
import { getCurrentUser, homePathFor } from "@/lib/server/auth";
import { Skeleton } from "./skeleton";

type Variant = "desktop" | "mobile";

/** Login / sign-up buttons, or "Mon espace" once signed in. Reads the session: render inside <Suspense>. */
export async function HeaderAccount({ variant }: { variant: Variant }) {
  const user = await getCurrentUser();
  const mobile = variant === "mobile";

  if (!user) {
    return (
      <div className={cn("flex gap-2", mobile && "flex-col")}>
        <LinkButton href="/connexion" variant={mobile ? "secondary" : "ghost"} size={mobile ? "lg" : "md"}>
          <LogIn size={16} aria-hidden />
          Connexion
        </LinkButton>
        <LinkButton href="/inscription" size={mobile ? "lg" : "md"}>
          <UserPlus size={16} aria-hidden />
          Inscription
        </LinkButton>
      </div>
    );
  }

  const displayName = user.isHero && user.hero ? user.hero.alias : user.firstName;
  return (
    <div className={mobile ? "flex flex-col gap-3" : "flex items-center gap-2"}>
      <div className={mobile ? "flex items-center gap-2.5" : "hidden items-center gap-2.5 lg:flex"}>
        <Avatar src={user.avatarUrl} label={displayName} size={mobile ? 40 : 32} />
        <span className={cn("max-w-36 truncate font-medium text-slate-200", mobile ? "text-base" : "text-sm")}>{displayName}</span>
      </div>
      <LinkButton href={homePathFor(user)} size={mobile ? "lg" : "md"}>
        <LayoutDashboard size={16} aria-hidden />
        Mon espace
      </LinkButton>
      <ApiForm endpoint={LOGOUT_ENDPOINT} className={cn(mobile && "flex")}>
        {mobile ? (
          <SubmitButton variant="secondary" size="lg" className="flex-1">
            <LogOut size={16} aria-hidden />
            Se déconnecter
          </SubmitButton>
        ) : (
          <SubmitButton variant="ghost" size="icon" title="Se déconnecter">
            <LogOut size={18} aria-hidden />
            <span className="sr-only">Se déconnecter</span>
          </SubmitButton>
        )}
      </ApiForm>
    </div>
  );
}

export function HeaderAccountSkeleton({ variant }: { variant: Variant }) {
  if (variant === "mobile") {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-12" rounded="rounded-2xl" />
        <Skeleton className="h-12" rounded="rounded-2xl" />
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <Skeleton className="h-10 w-28" />
      <Skeleton className="h-10 w-32" />
    </div>
  );
}
