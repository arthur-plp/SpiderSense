import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

/** Page shell of the citizen app: sticky glass header with a back button. */
export function MobilePage({ title, back = "/citoyen", action, children }: { title: string; back?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-[radial-gradient(90%_40%_at_50%_0%,rgb(30_64_125/0.35),transparent)] pb-12">
      <header className="glass sticky top-0 z-30 flex items-center gap-3 rounded-b-3xl border-t-0 px-3 py-3">
        <Link href={back} aria-label="Retour" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/8 text-white active:scale-95">
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-lg font-bold text-white">{title}</h1>
        {action}
      </header>
      <main className="px-4 pt-4">{children}</main>
    </div>
  );
}

export function MobilePageSkeleton({ title }: { title: string }) {
  return (
    <MobilePage title={title}>
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-24 animate-pulse rounded-2xl bg-white/5" />
        ))}
      </div>
    </MobilePage>
  );
}
