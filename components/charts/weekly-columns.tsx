"use client";

import { useState } from "react";
import { formatShortDate } from "@/lib/format";

const SERIES = "#3987e5";
const CONTEXT = "#2b3a57";
const HEIGHT = 140;

type Week = { weekStart: string; count: number };

/**
 * Interventions per week (8 weeks). Emphasis form: the current week carries the
 * accent, previous weeks are context. Labels on the current week and the peak;
 * every value is in the hover/focus tooltip and the screen-reader table.
 */
export function WeeklyColumns({ weeks }: { weeks: Week[] }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(...weeks.map((week) => week.count), 1);
  const peak = weeks.reduce((best, week, index) => (week.count > weeks[best].count ? index : best), 0);
  const current = weeks.length - 1;
  const label = (index: number) => `Semaine du ${formatShortDate(`${weeks[index].weekStart}T12:00:00Z`)}`;

  return (
    <figure>
      <div className="relative" style={{ height: HEIGHT + 28 }} onPointerLeave={() => setActive(null)}>
        {/* Recessive hairlines: baseline and max. */}
        <div className="absolute inset-x-0 border-t border-white/8" style={{ top: 18 }} aria-hidden>
          <span className="absolute -top-2.5 right-0 bg-ink-850 pl-1 text-[10px] tabular-nums text-slate-500">{max}</span>
        </div>
        <div className="absolute inset-x-0 border-t border-white/12" style={{ top: HEIGHT + 18 }} aria-hidden />
        <div className="absolute inset-x-0 bottom-[10px] flex items-end justify-around gap-1" style={{ height: HEIGHT }}>
          {weeks.map((week, index) => {
            const highlighted = index === current;
            const showLabel = index === current || index === peak;
            return (
              <button
                key={week.weekStart}
                type="button"
                aria-label={`${label(index)} : ${week.count} intervention(s)`}
                onPointerEnter={() => setActive(index)}
                onFocus={() => setActive(index)}
                onBlur={() => setActive(null)}
                className="relative flex h-full w-full max-w-12 flex-col items-center justify-end rounded-md outline-offset-2"
              >
                {showLabel && <span className="mb-1 text-xs font-semibold text-slate-100">{week.count}</span>}
                <span
                  className="w-full max-w-6 rounded-t-[4px] transition-[filter]"
                  style={{
                    height: `${(week.count / max) * (HEIGHT - 22)}px`,
                    minHeight: week.count > 0 ? 3 : 0,
                    backgroundColor: highlighted ? SERIES : CONTEXT,
                    filter: active === index ? "brightness(1.35)" : undefined,
                  }}
                />
              </button>
            );
          })}
        </div>
        {active !== null && (
          <div
            role="status"
            className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 rounded-lg border border-white/10 bg-ink-950/95 px-2.5 py-1.5 text-xs shadow-xl"
            style={{ left: `${((active + 0.5) / weeks.length) * 100}%` }}
          >
            <p className="font-semibold text-white">{weeks[active].count} intervention(s)</p>
            <p className="text-slate-400">{label(active)}</p>
          </div>
        )}
      </div>
      <div className="flex justify-around text-[10px] text-slate-500" aria-hidden>
        {weeks.map((week, index) => (
          <span key={week.weekStart} className={index === current ? "font-semibold text-slate-300" : undefined}>
            {index === current ? "Cette sem." : formatShortDate(`${week.weekStart}T12:00:00Z`).slice(0, 5)}
          </span>
        ))}
      </div>
      <figcaption className="sr-only">Nombre d&apos;interventions par semaine sur les huit dernières semaines.</figcaption>
    </figure>
  );
}
