import { MessageSquare } from "lucide-react";
import type { Metadata } from "next";
import { ReviewReplyForm } from "@/components/hero/review-reply-form";
import { HeroPage } from "@/components/hero/hero-page";
import { EmptyState, PageHeader, Panel, SectionTitle } from "@/components/ui/panel";
import { RelativeTime } from "@/components/ui/relative-time";
import { Stars } from "@/components/ui/stars";
import { formatRating } from "@/lib/format";
import { requireHero } from "@/lib/server/auth";
import { listHeroReviews } from "@/lib/server/services/reviews";

export const metadata: Metadata = { title: "Réputation" };

export default async function HeroReputationPage() {
  const hero = await requireHero();
  const reviews = await listHeroReviews(hero.id);
  const average = reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : null;
  const distribution = [5, 4, 3, 2, 1].map((rating) => ({ rating, count: reviews.filter((review) => review.rating === rating).length }));
  const max = Math.max(1, ...distribution.map((row) => row.count));

  return (
    <HeroPage>
      <PageHeader eyebrow="Espace professionnel" title="Ma réputation" description="Les avis laissés par les citoyens après vos interventions. Vous pouvez y répondre publiquement." />
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Panel className="h-fit p-5">
          <p className="text-xs font-medium text-slate-400">Note globale</p>
          <p className="mt-1 text-5xl font-bold text-white">{formatRating(average)}<span className="text-xl text-slate-500"> / 5</span></p>
          <Stars value={average} count={reviews.length} size={18} className="mt-2" />
          <table className="mt-5 w-full text-sm">
            <caption className="sr-only">Répartition des notes</caption>
            <tbody>
              {distribution.map((row) => (
                <tr key={row.rating}>
                  <th scope="row" className="w-10 py-1 text-left font-normal text-slate-400">{row.rating} ★</th>
                  <td className="py-1">
                    <div className="h-2 rounded-r-[4px] bg-[#3987e5]" style={{ width: `${(row.count / max) * 100}%`, minWidth: row.count ? 3 : 0 }} />
                  </td>
                  <td className="w-8 py-1 text-right text-xs tabular-nums text-slate-400">{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <section aria-label="Commentaires des citoyens">
          <SectionTitle>{reviews.length} avis</SectionTitle>
          {reviews.length === 0 ? (
            <EmptyState icon={<MessageSquare className="size-8" />} title="Pas encore d'avis">
              Les citoyens peuvent noter vos interventions une fois terminées.
            </EmptyState>
          ) : (
            <ul className="flex flex-col gap-3">
              {reviews.map((review) => (
                <li key={review.id}>
                  <Panel className="p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <Stars value={review.rating} />
                        <span className="text-sm font-medium text-slate-200">{review.citizenName}</span>
                      </div>
                      <span className="text-xs text-slate-500">
                        {review.incidentType} · {review.incidentCity} · <RelativeTime value={review.createdAt} />
                      </span>
                    </div>
                    {review.comment ? <p className="mt-2 text-sm text-slate-300">« {review.comment} »</p> : <p className="mt-2 text-sm italic text-slate-500">Note sans commentaire.</p>}
                    {review.heroReply ? (
                      <div className="mt-3 rounded-xl border-l-2 border-sky-400/60 bg-sky-400/5 px-3 py-2 text-sm text-slate-300">
                        <p className="text-xs font-semibold text-sky-300">Votre réponse</p>
                        {review.heroReply}
                      </div>
                    ) : review.comment ? (
                      <ReviewReplyForm reviewId={review.id} />
                    ) : null}
                  </Panel>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </HeroPage>
  );
}
