"use client";

import {
  Activity,
  Inbox,
  LayoutDashboard,
  type LucideIcon,
  Mail,
  Menu,
  Newspaper,
  Shield,
  Siren,
  Skull,
  Star,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, Suspense, useEffect, useState } from "react";
import { cn } from "@/components/ui/cn";

type NavItem = { href: string; label: string; icon: LucideIcon };

const NAV_ITEMS: NavItem[] = [
  { href: "/admin", label: "Vue d'ensemble", icon: LayoutDashboard },
  { href: "/admin/incidents", label: "Incidents", icon: Siren },
  { href: "/admin/utilisateurs", label: "Utilisateurs", icon: Users },
  { href: "/admin/heros", label: "Super-héros", icon: Shield },
  { href: "/admin/demandes", label: "Demandes", icon: Inbox },
  { href: "/admin/avis", label: "Avis", icon: Star },
  { href: "/admin/vilains", label: "Vilains", icon: Skull },
  { href: "/admin/newsletter", label: "Newsletter", icon: Mail },
  { href: "/admin/blog", label: "Blog", icon: Newspaper },
  { href: "/admin/activite", label: "Activité", icon: Activity },
];

const isActive = (href: string, pathname: string | null) =>
  pathname !== null && (href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`));

/** Plain list, also used as the Suspense fallback while the pathname is unknown. */
export function NavLinkList({ pathname = null, onNavigate }: { pathname?: string | null; onNavigate?: () => void }) {
  return (
    <ul className="flex flex-col gap-0.5">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = isActive(href, pathname);
        return (
          <li key={href}>
            <Link
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sky-400/12 text-sky-200 ring-1 ring-inset ring-sky-400/25"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-100",
              )}
            >
              <Icon className={cn("size-4.5 shrink-0", active ? "text-sky-300" : "text-slate-500")} aria-hidden />
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function ActiveNavLinkList({ onNavigate }: { onNavigate?: () => void }) {
  return <NavLinkList pathname={usePathname()} onNavigate={onNavigate} />;
}

/** The pathname of a dynamic route is only known at request time: suspend locally. */
export function AdminNavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Administration">
      <Suspense fallback={<NavLinkList onNavigate={onNavigate} />}>
        <ActiveNavLinkList onNavigate={onNavigate} />
      </Suspense>
    </nav>
  );
}

/** Top bar with a slide-down menu, below the `lg` breakpoint. */
export function MobileAdminBar({ brand, footer }: { brand: ReactNode; footer: ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div className="sticky top-0 z-40 border-b border-white/8 bg-ink-900/95 backdrop-blur lg:hidden">
      <div className="flex h-14 items-center justify-between px-4">
        {brand}
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="admin-mobile-menu"
          aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
          className="inline-flex size-10 items-center justify-center rounded-xl text-slate-200 hover:bg-white/5"
        >
          {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
        </button>
      </div>
      <div
        id="admin-mobile-menu"
        hidden={!open}
        className="max-h-[calc(100dvh-3.5rem)] overflow-y-auto border-t border-white/8 px-3 pb-4 pt-3"
      >
        <AdminNavLinks onNavigate={() => setOpen(false)} />
        <div className="mt-4 border-t border-white/8 pt-4">{footer}</div>
      </div>
    </div>
  );
}
