"use client";

import { ChevronLeft, ChevronRight, Clock, MapPin, Pause, Play, ShieldCheck } from "lucide-react";
import { type FocusEvent, type ReactNode, useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { IncidentIcon } from "@/components/ui/incident-icon";
import { RelativeTime } from "@/components/ui/relative-time";
import { pluralize } from "@/lib/format";

export type SuccessSlide = {
  id: string;
  typeCode: string;
  typeLabel: string;
  city: string;
  heroAlias: string | null;
  villainAlias: string | null;
  villainImprisoned: boolean;
  peopleInvolved: number;
  endedAt: string;
};

const AUTO_ADVANCE_MS = 6000;
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeToMotionPreference(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
const prefersReducedMotion = () => window.matchMedia(REDUCED_MOTION).matches;
// No auto-advance before hydration.
const prefersReducedMotionOnServer = () => true;

/**
 * Scroll-snap carousel (WAI-ARIA APG pattern): previous/next buttons, an
 * auto-advance that pauses on hover or focus, can be stopped, and is off by
 * default when the user prefers reduced motion.
 */
export function SuccessCarousel({ slides, heading }: { slides: SuccessSlide[]; heading: ReactNode }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const scrollerId = useId();
  const reducedMotion = useSyncExternalStore(subscribeToMotionPreference, prefersReducedMotion, prefersReducedMotionOnServer);
  const [userWantsPlay, setUserWantsPlay] = useState<boolean | null>(null);
  const [interacting, setInteracting] = useState(false);
  const playing = slides.length > 1 && (userWantsPlay ?? !reducedMotion);

  const step = useCallback(
    (direction: 1 | -1) => {
      const scroller = scrollerRef.current;
      if (!scroller) return;
      const behavior: ScrollBehavior = reducedMotion ? "auto" : "smooth";
      const slide = scroller.querySelector<HTMLElement>("[data-slide]");
      const gap = parseFloat(getComputedStyle(scroller).columnGap) || 0;
      const distance = slide ? slide.offsetWidth + gap : scroller.clientWidth;
      const atStart = scroller.scrollLeft <= 4;
      const atEnd = scroller.scrollLeft + scroller.clientWidth >= scroller.scrollWidth - 4;
      if (direction === 1 && atEnd) scroller.scrollTo({ left: 0, behavior });
      else if (direction === -1 && atStart) scroller.scrollTo({ left: scroller.scrollWidth, behavior });
      else scroller.scrollBy({ left: direction * distance, behavior });
    },
    [reducedMotion],
  );

  useEffect(() => {
    if (!playing || interacting) return;
    const timer = setInterval(() => step(1), AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [playing, interacting, step]);

  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setInteracting(false);
  }

  const controlClass = buttonClasses("glass", "icon");

  return (
    <section aria-roledescription="carrousel" aria-label="Dernières interventions réussies">
      <div className="flex flex-wrap items-end justify-between gap-4">
        {heading}
        {slides.length > 1 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={controlClass}
              onClick={() => setUserWantsPlay(!playing)}
              aria-label={playing ? "Mettre en pause le défilement automatique" : "Lancer le défilement automatique"}
            >
              {playing ? <Pause size={18} aria-hidden /> : <Play size={18} aria-hidden />}
            </button>
            <button type="button" className={controlClass} onClick={() => step(-1)} aria-controls={scrollerId} aria-label="Interventions précédentes">
              <ChevronLeft size={20} aria-hidden />
            </button>
            <button type="button" className={controlClass} onClick={() => step(1)} aria-controls={scrollerId} aria-label="Interventions suivantes">
              <ChevronRight size={20} aria-hidden />
            </button>
          </div>
        )}
      </div>

      <div
        id={scrollerId}
        ref={scrollerRef}
        tabIndex={0}
        aria-label="Interventions réussies, faites défiler horizontalement"
        onMouseEnter={() => setInteracting(true)}
        onMouseLeave={() => setInteracting(false)}
        onFocus={() => setInteracting(true)}
        onBlur={handleBlur}
        className="-mx-4 mt-8 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto rounded-3xl px-4 pb-3 [scrollbar-width:none] sm:-mx-6 sm:scroll-px-6 sm:px-6 lg:-mx-8 lg:scroll-px-8 lg:px-8 [&::-webkit-scrollbar]:hidden"
      >
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            data-slide
            role="group"
            aria-roledescription="diapositive"
            aria-label={`${index + 1} sur ${slides.length}`}
            className="w-[85%] shrink-0 snap-start sm:w-[calc((100%-1rem)/2)] lg:w-[calc((100%-2rem)/3)]"
          >
            <SuccessCard slide={slide} />
          </div>
        ))}
      </div>
    </section>
  );
}

function SuccessCard({ slide }: { slide: SuccessSlide }) {
  return (
    <article className="glass flex h-full flex-col rounded-3xl p-5">
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-emerald-400/12 text-emerald-200 ring-1 ring-emerald-300/25">
          <IncidentIcon code={slide.typeCode} size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-white">{slide.typeLabel}</h3>
          <p className="mt-0.5 flex items-center gap-1 text-sm text-slate-400">
            <MapPin size={14} className="shrink-0" aria-hidden />
            <span className="truncate">{slide.city}</span>
          </p>
        </div>
        <Badge tone="success" dot>
          Réussie
        </Badge>
      </div>
      <p className="mt-4 flex items-start gap-2 text-sm text-slate-300">
        <ShieldCheck size={16} className="mt-0.5 shrink-0 text-sky-300" aria-hidden />
        <span>
          Résolu par <strong className="font-semibold text-white">{slide.heroAlias ?? "un super-héros"}</strong>
          {slide.villainAlias && (
            <>
              {" "}
              face à <strong className="font-semibold text-rose-200">{slide.villainAlias}</strong>
            </>
          )}
        </span>
      </p>
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-4 text-xs text-slate-400">
        <span className="mr-auto inline-flex items-center gap-1">
          <Clock size={13} aria-hidden />
          <RelativeTime value={slide.endedAt} />
        </span>
        {slide.peopleInvolved > 0 && <Badge tone="info">{pluralize(slide.peopleInvolved, "citoyen secouru", "citoyens secourus")}</Badge>}
        {slide.villainImprisoned && <Badge tone="brand">Vilain sous les verrous</Badge>}
      </div>
    </article>
  );
}
