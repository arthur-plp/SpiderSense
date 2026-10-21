import { Mail, Phone } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { Container } from "./container";
import { FooterNewsletter, FooterNewsletterSkeleton } from "./footer-newsletter";
import { Logo } from "./logo";
import { SITE_NAV } from "./routes";

const COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  { title: "Plateforme", links: SITE_NAV.map(({ href, label }) => ({ href, label })) },
  {
    title: "Mon compte",
    links: [
      { href: "/connexion", label: "Connexion" },
      { href: "/inscription", label: "Créer un compte" },
      { href: "/mot-de-passe-oublie", label: "Mot de passe oublié" },
    ],
  },
  {
    title: "Informations",
    links: [{ href: "/confidentialite", label: "Confidentialité (RGPD)" }],
  },
];

export function SiteFooter() {
  return (
    <footer className="relative mt-20 border-t border-white/6 bg-ink-900/70">
      <Container className="py-12">
        <section aria-labelledby="newsletter-title" className="glass glass-strong grid gap-6 rounded-3xl p-6 sm:p-8 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <div className="flex gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand/15 text-brand ring-1 ring-brand/30">
              <Mail size={22} aria-hidden />
            </span>
            <div>
              <h2 id="newsletter-title" className="text-lg font-bold text-white">
                La newsletter des héros
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Les interventions marquantes, les nouveaux héros et nos conseils de sécurité, directement dans votre boîte mail.
              </p>
            </div>
          </div>
          <Suspense fallback={<FooterNewsletterSkeleton />}>
            <FooterNewsletter />
          </Suspense>
        </section>

        <div className="mt-12 grid gap-10 lg:grid-cols-[1.2fr_2fr]">
          <div className="max-w-sm">
            <Logo />
            <p className="mt-4 text-sm leading-relaxed text-slate-400">
              Heros-SOS rapproche les citoyens et les super-héros de Paris : un geste pour donner l&apos;alerte, une intervention suivie
              en direct, une réputation construite par les citoyens.
            </p>
          </div>
          <nav aria-label="Liens du pied de page" className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {COLUMNS.map((column) => (
              <div key={column.title}>
                <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{column.title}</h2>
                <ul className="mt-4 space-y-2.5">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className="text-sm text-slate-300 transition-colors hover:text-white">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
      </Container>
      <div className="border-t border-white/6">
        <Container className="flex flex-col gap-3 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>Heros-SOS — projet de démonstration. Les personnages Marvel appartiennent à leurs ayants droit.</p>
          <p className="flex items-center gap-1.5 text-slate-400">
            <Phone size={13} aria-hidden />
            Urgence réelle ? Composez le <strong className="text-white">112</strong>.
          </p>
        </Container>
      </div>
    </footer>
  );
}
