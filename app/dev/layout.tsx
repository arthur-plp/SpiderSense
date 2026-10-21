import { FlaskConical } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/site/container";
import { Logo } from "@/components/site/logo";

export const metadata: Metadata = {
  title: { default: "Outils de démo", template: "%s · Outils de démo · Spider Sense" },
  robots: { index: false, follow: false },
};

export default function DevLayout({ children }: LayoutProps<"/dev">) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-white/6 bg-ink-900/80">
        <Container className="flex h-14 items-center gap-3">
          <Link href="/" className="rounded-lg" aria-label="Spider Sense, retour au site">
            <Logo />
          </Link>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/15 px-2.5 py-1 text-xs font-semibold text-amber-200 ring-1 ring-brand/30">
            <FlaskConical size={13} aria-hidden />
            Outils de démo
          </span>
          <Link href="/" className="ml-auto text-sm text-slate-400 hover:text-white">
            Retour au site
          </Link>
        </Container>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
