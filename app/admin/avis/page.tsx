import { Eye, EyeOff, MessageSquareReply, Star } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ActionButton } from "@/components/admin/action-button";
import { FilterField, FilterForm } from "@/components/admin/filter-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { Select } from "@/components/ui/form";
import { EmptyState, PageHeader, Panel } from "@/components/ui/panel";
import { RelativeTime } from "@/components/ui/relative-time";
import { Stars } from "@/components/ui/stars";
import { pluralize } from "@/lib/format";
import { requireStaff } from "@/lib/server/auth";
import { firstParam } from "@/lib/server/services/admin/params";
import { listAllReviews } from "@/lib/server/services/reviews";

export const metadata: Metadata = { title: "Avis" };

const VISIBILITY = { visible: "Visibles", hidden: "Masqués" } as const;

export default async function AdminReviewsPage({ searchParams }: PageProps<"/admin/avis">) {
  await requireStaff();
  const params = await searchParams;
  const visibilityParam = firstParam(params.visibilite);
  const visibility = visibilityParam && visibilityParam in VISIBILITY ? (visibilityParam as keyof typeof VISIBILITY) : null;
  const heroId = firstParam(params.heros) ?? "";
  const ratingParam = Number(firstParam(params.note));
  const maxRating = Number.isInteger(ratingParam) && ratingParam >= 1 && ratingParam <= 5 ? ratingParam : null;

  const all = await listAllReviews();
  const heroes = [...new Map(all.map((review) => [review.heroId, review.heroAlias])).entries()].sort((a, b) => a[1].localeCompare(b[1]));
  const reviews = all.filter(
    (review) =>
      (visibility === null || review.hidden === (visibility === "hidden")) &&
      (!heroId || review.heroId === heroId) &&
      (maxRating === null || review.rating <= maxRating),
  );
  const hiddenCount = all.filter((review) => review.hidden).length;

  return (
    <>
      <PageHeader
        eyebrow="Modération"
        title="Avis des citoyens"
        description={`${pluralize(all.length, "avis", "avis")} dont ${pluralize(hiddenCount, "masqué")}. Un avis masqué disparaît de la page de réputation du héros et de sa note moyenne.`}
      />

      <FilterForm action="/admin/avis" className="mb-4">
        <FilterField label="Visibilité" htmlFor="visibilite">
          <Select name="visibilite" defaultValue={visibility ?? ""} className="h-10 py-0 text-sm">
            <option value="">Tous les avis</option>
            {Object.entries(VISIBILITY).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </FilterField>
        <FilterField label="Super-héros" htmlFor="heros">
          <Select name="heros" defaultValue={heroId} className="h-10 py-0 text-sm">
            <option value="">Tous les héros</option>
            {heroes.map(([id, alias]) => (
              <option key={id} value={id}>
                {alias}
              </option>
            ))}
          </Select>
        </FilterField>
        <FilterField label="Note" htmlFor="note">
          <Select name="note" defaultValue={maxRating ?? ""} className="h-10 py-0 text-sm">
            <option value="">Toutes les notes</option>
            {[1, 2, 3].map((rating) => (
              <option key={rating} value={rating}>
                {rating === 1 ? "1 étoile" : `${rating} étoiles ou moins`}
              </option>
            ))}
          </Select>
        </FilterField>
        <Button type="submit" variant="secondary" className="h-10">
          Filtrer
        </Button>
      </FilterForm>

      {reviews.length === 0 ? (
        <EmptyState icon={<Star className="size-8" />} title="Aucun avis">
          Aucun avis ne correspond à ces filtres.
        </EmptyState>
      ) : (
        <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {reviews.map((review) => (
            <li key={review.id}>
              <Panel className={cn("flex h-full flex-col gap-3 p-5", review.hidden && "border-rose-400/25 bg-rose-950/10")}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <Stars value={review.rating} size={15} />
                      {review.hidden && (
                        <Badge tone="danger">
                          <EyeOff className="size-3" aria-hidden />
                          Masqué
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-slate-300">
                      <span className="font-semibold text-slate-100">{review.citizenName}</span> sur{" "}
                      <Link href={`/admin/utilisateurs/${review.heroId}`} className="font-semibold text-amber-200 hover:underline">
                        {review.heroAlias}
                      </Link>
                    </p>
                    <Link href={`/admin/incidents/${review.incidentId}`} className="text-xs text-sky-300 hover:underline">
                      {review.incidentType} · {review.incidentCity}
                    </Link>
                  </div>
                  <RelativeTime value={review.createdAt} className="text-xs text-slate-500" />
                </div>
                {review.comment ? (
                  <blockquote className="border-l-2 border-white/10 pl-3 text-sm text-slate-200">« {review.comment} »</blockquote>
                ) : (
                  <p className="text-sm italic text-slate-500">Note sans commentaire.</p>
                )}
                {review.heroReply && (
                  <div className="rounded-xl bg-white/[0.03] p-3 text-sm text-slate-300">
                    <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                      <MessageSquareReply className="size-3.5" aria-hidden />
                      Réponse de {review.heroAlias}
                    </p>
                    {review.heroReply}
                  </div>
                )}
                <div className="mt-auto flex justify-end pt-1">
                  {review.hidden ? (
                    <ActionButton endpoint={{ method: "PATCH", path: `/api/admin/reviews/${review.id}`, body: { hidden: false } }}>
                      <Eye className="size-4" aria-hidden />
                      Rétablir
                    </ActionButton>
                  ) : (
                    <ActionButton
                      endpoint={{ method: "PATCH", path: `/api/admin/reviews/${review.id}`, body: { hidden: true } }}
                      variant="danger"
                      confirm={{
                        title: "Masquer cet avis ?",
                        description: "Il ne sera plus affiché publiquement ni compté dans la note du héros. Vous pourrez le rétablir.",
                        confirmLabel: "Masquer",
                      }}
                    >
                      <EyeOff className="size-4" aria-hidden />
                      Masquer
                    </ActionButton>
                  )}
                </div>
              </Panel>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
