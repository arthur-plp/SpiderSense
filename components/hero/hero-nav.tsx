"use client";

import { BarChart3, Film, Map, Star, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/components/ui/cn";

const LINKS = [
  { href: "/heros", label: "Opérations", icon: Map },
  { href: "/heros/statistiques", label: "Statistiques", icon: BarChart3 },
  { href: "/heros/profil", label: "Profil", icon: UserRound },
  { href: "/heros/films", label: "Mes films", icon: Film },
  { href: "/heros/reputation", label: "Réputation", icon: Star },
] as const;

export function HeroNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Espace professionnel" className="flex items-center gap-1">
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = href === "/heros" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition",
              active ? "bg-sky-400/15 text-white ring-1 ring-inset ring-sky-300/35" : "text-slate-300 hover:bg-white/5 hover:text-white",
            )}
          >
            <Icon className="size-4" aria-hidden />
            <span className="hidden xl:inline">{label}</span>
            <span className="sr-only xl:hidden">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
