import { ChevronRight, Star } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { MobilePage, MobilePageSkeleton } from "@/components/citizen/mobile-page";
import { Badge } from "@/components/ui/badge";
import { EmptyState, SectionTitle } from "@/components/ui/panel";
import { RelativeTime } from "@/components/ui/relative-time";
import { requireUser } from "@/lib/server/auth";
import { listRateableInterventions } from "@/lib/server/services/reviews";

export const metadata: Metadata = { title: "Noter un super-héros" };

export default function RatePage() {
  return (
    <Suspense fallback={<MobilePageSkeleton title="Noter un super-héros" />}>
      <Rate />
    </Suspense>
  );
}

async function Rate() {
  const user = await requireUser();
  const interventions = await listRateableInterventions(user.id);
  return (
    <MobilePage title="Noter un super-héros">
      <p className="mb-4 text-sm text-slate-400">Les dernières interventions sur les incidents que vous avez signalés. Votre note et votre commentaire aident les héros à progresser.</p>
      <SectionTitle>À noter ({interventions.length})</SectionTitle>
      {interventions.length === 0 ? (
        <EmptyState icon={<Star className="size-8" />} title="Rien à noter pour le moment">
          Vous serez invité à noter le super-héros après chaque intervention sur vos signalements.
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {interventions.map((item) => (
            <li key={item.incidentId}>
              <Link href={`/citoyen/incidents/${item.incidentId}#noter`} className="glass flex items-center gap-3 rounded-2xl p-3.5">
                <span className="flex size-11 items-center justify-center rounded-xl bg-brand/15 text-brand">
                  <Star className="size-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-white">{item.heroAlias}</span>
                  <span className="block truncate text-xs text-slate-400">
                    {item.typeLabel} · {item.city} · <RelativeTime value={item.endedAt} />
                  </span>
                </span>
                <Badge tone={item.status === "SUCCEEDED" ? "success" : "danger"}>{item.status === "SUCCEEDED" ? "Réussie" : "Échouée"}</Badge>
                <ChevronRight className="size-4 text-slate-500" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </MobilePage>
  );
}
