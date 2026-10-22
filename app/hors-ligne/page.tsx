import { WifiOff } from "lucide-react";
import type { Metadata } from "next";
import { Logo } from "@/components/site/logo";

export const metadata: Metadata = { title: "Hors ligne" };

/** Served by the service worker when a page that was never visited is opened without network. */
export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-ink-950 px-6 text-center">
      <Logo />
      <span className="flex size-16 items-center justify-center rounded-full bg-amber-300/15 text-amber-200 ring-1 ring-amber-200/40">
        <WifiOff className="size-8" aria-hidden />
      </span>
      <div className="max-w-sm space-y-2">
        <h1 className="text-xl font-bold text-white">Vous êtes hors ligne</h1>
        <p className="text-sm text-slate-300">
          Cette page n&apos;a pas encore été ouverte sur cet appareil. Les pages déjà visitées de l&apos;app citoyen et du centre
          d&apos;opérations restent disponibles, et vos actions sont envoyées dès le retour du réseau.
        </p>
        <p className="text-xs text-slate-500">En cas d&apos;urgence vitale, appelez le 112.</p>
      </div>
    </main>
  );
}
