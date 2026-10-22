import { LogOut, Shield } from "lucide-react";
import Link from "next/link";
import { ApiForm } from "@/components/ui/api-form";
import { Avatar } from "@/components/ui/avatar";
import { LOGOUT_ENDPOINT } from "@/lib/api-client";
import { requireHero } from "@/lib/server/auth";
import { getHero } from "@/lib/server/services/heroes";
import { DutyToggle } from "./duty-toggle";
import { HeroNav } from "./hero-nav";

/** Floating glass bar shared by every page of the hero space. */
export async function HeroTopBar() {
  const user = await requireHero();
  const hero = await getHero(user.id);
  return (
    <TopBarFrame>
      <HeroNav />
      <div className="flex items-center gap-2">
        <DutyToggle onDuty={hero?.onDuty ?? true} busy={hero?.availability === "BUSY"} />
        <div className="hidden items-center gap-2.5 border-l border-white/10 pl-3 md:flex">
          <Avatar src={user.avatarUrl} label={user.hero?.alias ?? user.firstName} size={34} />
          <div className="leading-tight">
            <p className="text-sm font-semibold text-white">{user.hero?.alias}</p>
            <p className="text-[11px] text-slate-400">
              {user.firstName} {user.lastName}
            </p>
          </div>
        </div>
        <ApiForm endpoint={LOGOUT_ENDPOINT}>
          <button type="submit" className="flex size-9 items-center justify-center rounded-xl text-slate-400 hover:bg-white/5 hover:text-white" aria-label="Se déconnecter" title="Se déconnecter">
            <LogOut className="size-4" />
          </button>
        </ApiForm>
      </div>
    </TopBarFrame>
  );
}

export function TopBarFrame({ children }: { children?: React.ReactNode }) {
  return (
    <header className="glass fixed inset-x-4 top-4 z-20 flex h-16 items-center justify-between gap-4 rounded-2xl px-4">
      <Link href="/heros" className="flex items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-xl bg-sos text-white shadow-[0_0_20px_-4px_var(--color-sos)]">
          <Shield className="size-5" aria-hidden />
        </span>
        <span className="leading-tight">
          <span className="block text-sm font-bold tracking-tight text-white">Spider Sense</span>
          <span className="block text-[11px] uppercase tracking-[0.16em] text-sky-300/80">Centre d&apos;opérations</span>
        </span>
      </Link>
      {children}
    </header>
  );
}
