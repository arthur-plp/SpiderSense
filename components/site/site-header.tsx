import Link from "next/link";
import { Suspense } from "react";
import { Container } from "./container";
import { HeaderAccount, HeaderAccountSkeleton } from "./header-account";
import { Logo } from "./logo";
import { MobileMenu } from "./mobile-menu";
import { NavLinks, NavList } from "./nav-links";

/** Static shell of the header; the active link and the account area stream in. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/6 bg-ink-950/70 backdrop-blur-xl">
      <Container className="flex h-16 items-center gap-6">
        <Link href="/" className="shrink-0 rounded-lg" aria-label="Spider Sense, retour à l'accueil">
          <Logo />
        </Link>
        <nav aria-label="Navigation principale" className="hidden md:block">
          <Suspense fallback={<NavList variant="desktop" />}>
            <NavLinks variant="desktop" />
          </Suspense>
        </nav>
        <div className="ml-auto hidden md:block">
          <Suspense fallback={<HeaderAccountSkeleton variant="desktop" />}>
            <HeaderAccount variant="desktop" />
          </Suspense>
        </div>
        <MobileMenu
          className="ml-auto"
          nav={
            <Suspense fallback={<NavList variant="mobile" />}>
              <NavLinks variant="mobile" />
            </Suspense>
          }
          account={
            <Suspense fallback={<HeaderAccountSkeleton variant="mobile" />}>
              <HeaderAccount variant="mobile" />
            </Suspense>
          }
        />
      </Container>
    </header>
  );
}
