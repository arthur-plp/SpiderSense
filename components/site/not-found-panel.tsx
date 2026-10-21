import { House, ShieldCheck } from "lucide-react";
import { LinkButton } from "@/components/ui/button";

/** Friendly 404 content, shared by the root and the site not-found pages. */
export function NotFoundPanel() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-16 text-center sm:py-24">
      <p aria-hidden className="bg-gradient-to-b from-white to-sky-300/40 bg-clip-text text-8xl font-black tracking-tighter text-transparent sm:text-9xl">
        404
      </p>
      <h1 className="mt-4 text-2xl font-bold tracking-tight text-white sm:text-3xl">Cette page s&apos;est volatilisée</h1>
      <p className="mt-3 text-slate-400">
        Même le sens d&apos;araignée ne la retrouve pas. Le lien est peut-être erroné, ou la page a été déplacée par un vilain farceur.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <LinkButton href="/" size="lg">
          <House size={18} aria-hidden />
          Retour à l&apos;accueil
        </LinkButton>
        <LinkButton href="/super-heros" variant="glass" size="lg">
          <ShieldCheck size={18} aria-hidden />
          Voir les super-héros
        </LinkButton>
      </div>
    </div>
  );
}
