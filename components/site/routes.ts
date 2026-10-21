import { Film, House, type LucideIcon, Newspaper, ShieldCheck } from "lucide-react";

export type SiteNavItem = { href: string; label: string; icon: LucideIcon };

export const SITE_NAV: SiteNavItem[] = [
  { href: "/", label: "Accueil", icon: House },
  { href: "/super-heros", label: "Super-héros", icon: ShieldCheck },
  { href: "/videotheque", label: "Vidéothèque", icon: Film },
  { href: "/blog", label: "Blog", icon: Newspaper },
];

export function isActivePath(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/** Account settings page of each area (password, newsletter…). */
export function accountPathFor(user: { isHero: boolean; isStaff: boolean }): string {
  if (user.isStaff) return "/admin";
  if (user.isHero) return "/heros/profil";
  return "/citoyen/compte";
}
