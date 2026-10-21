import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/site/container";
import { Logo } from "@/components/site/logo";
import { NotFoundPanel } from "@/components/site/not-found-panel";

export const metadata: Metadata = { title: "Page introuvable" };

/** Unmatched URLs: rendered in the root layout only, so it brings a minimal header. */
export default function NotFound() {
  return (
    <div className="relative isolate flex flex-1 flex-col">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-160 bg-[radial-gradient(60rem_30rem_at_50%_-10rem,rgb(56_189_248/0.18),transparent)]" />
      <header className="border-b border-white/6">
        <Container className="flex h-16 items-center">
          <Link href="/" className="rounded-lg" aria-label="Spider Sense, retour à l'accueil">
            <Logo />
          </Link>
        </Container>
      </header>
      <main className="flex flex-1 flex-col justify-center">
        <NotFoundPanel />
      </main>
    </div>
  );
}
