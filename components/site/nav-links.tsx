"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/components/ui/cn";
import { isActivePath, SITE_NAV } from "./routes";

type Variant = "desktop" | "mobile";

/** Main navigation with the current page highlighted. Render inside <Suspense>. */
export function NavLinks({ variant }: { variant: Variant }) {
  const pathname = usePathname();
  return <NavList variant={variant} pathname={pathname} />;
}

/** Same links without active state: the Suspense fallback of NavLinks. */
export function NavList({ variant, pathname = null }: { variant: Variant; pathname?: string | null }) {
  const mobile = variant === "mobile";
  return (
    <ul className={mobile ? "flex flex-col gap-1" : "flex items-center gap-1"}>
      {SITE_NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname !== null && isActivePath(pathname, href);
        return (
          <li key={href}>
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 font-medium transition-colors",
                mobile ? "rounded-2xl px-4 py-3 text-base" : "rounded-xl px-3 py-2 text-sm",
                active ? "bg-white/8 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white",
              )}
            >
              {mobile && <Icon size={18} className={active ? "text-sky-300" : "text-slate-500"} aria-hidden />}
              {label}
              {active && !mobile && <span className="sr-only">(page actuelle)</span>}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
