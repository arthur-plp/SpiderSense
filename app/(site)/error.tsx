"use client";

import { House, RotateCcw, TriangleAlert } from "lucide-react";
import { useEffect } from "react";
import { Button, LinkButton } from "@/components/ui/button";

export default function SiteError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const digest = error instanceof Error && "digest" in error && typeof error.digest === "string" ? error.digest : null;

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-16 text-center sm:py-24">
      <span className="grid size-16 place-items-center rounded-3xl bg-sos/15 text-rose-200 shadow-[0_0_50px_-10px_rgb(255_61_90/0.7)] ring-1 ring-sos/30">
        <TriangleAlert size={30} aria-hidden />
      </span>
      <h1 className="mt-6 text-2xl font-bold tracking-tight text-white sm:text-3xl">Un vilain a coupé les câbles</h1>
      <p className="mt-3 text-slate-400">
        Une erreur inattendue nous empêche d&apos;afficher cette page. Réessayez dans un instant : nos héros de la technique sont sur le
        coup.
      </p>
      {digest && <p className="mt-2 font-mono text-xs text-slate-500">Référence : {digest}</p>}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button size="lg" onClick={() => retry()}>
          <RotateCcw size={18} aria-hidden />
          Réessayer
        </Button>
        <LinkButton href="/" variant="glass" size="lg">
          <House size={18} aria-hidden />
          Retour à l&apos;accueil
        </LinkButton>
      </div>
    </div>
  );
}
