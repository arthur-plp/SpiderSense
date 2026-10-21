import { MapPin, ShieldCheck, Siren } from "lucide-react";

/** Decorative glowing SOS buzzer with pulsing rings and floating status chips. */
export function SosIllustration() {
  return (
    <div aria-hidden className="relative mx-auto grid size-76 place-items-center sm:size-96">
      <div className="absolute inset-6 rounded-full bg-[radial-gradient(closest-side,rgb(255_61_90/0.35),transparent)] blur-2xl" />
      <div className="absolute inset-0 rounded-full border border-sky-300/10" />
      <div className="absolute inset-10 rounded-full border border-dashed border-sky-300/15" />
      {[0, 0.8, 1.6].map((delay) => (
        <span
          key={delay}
          className="absolute size-40 animate-sos-ring rounded-full border-2 border-sos/50 sm:size-48"
          style={{ animationDelay: `${delay}s` }}
        />
      ))}
      <div className="relative grid size-44 place-items-center rounded-full bg-gradient-to-b from-slate-200/25 to-slate-900/60 p-3 shadow-[0_30px_80px_-20px_rgb(255_61_90/0.65)] ring-1 ring-white/15 sm:size-52">
        <div className="grid size-full place-items-center rounded-full bg-[radial-gradient(circle_at_35%_28%,#ff8da0,#ff3d5a_45%,#a50f2c)] shadow-[inset_0_-12px_26px_rgb(0_0_0/0.4),inset_0_8px_16px_rgb(255_255_255/0.35)]">
          <div className="flex flex-col items-center">
            <Siren className="mb-1 size-7 text-white/85 sm:size-8" />
            <span className="text-4xl font-black tracking-[0.14em] text-white drop-shadow-[0_2px_6px_rgb(0_0_0/0.35)] sm:text-5xl">SOS</span>
          </div>
        </div>
      </div>

      <div className="glass absolute left-0 top-8 flex animate-slide-up items-center gap-2.5 rounded-2xl px-3 py-2 [animation-delay:0.3s] sm:-left-6">
        <span className="grid size-8 place-items-center rounded-xl bg-sky-400/20 text-sky-200">
          <ShieldCheck size={16} />
        </span>
        <span className="text-left leading-tight">
          <span className="block text-xs font-semibold text-white">Spider-Man en route</span>
          <span className="block text-[11px] text-slate-400">Arrivée estimée : 2 min</span>
        </span>
      </div>
      <div className="glass absolute bottom-10 right-0 flex animate-slide-up items-center gap-2.5 rounded-2xl px-3 py-2 [animation-delay:0.6s] sm:-right-4">
        <span className="grid size-8 place-items-center rounded-xl bg-emerald-400/20 text-emerald-200">
          <MapPin size={16} />
        </span>
        <span className="text-left leading-tight">
          <span className="block text-xs font-semibold text-white">Incident résolu</span>
          <span className="block text-[11px] text-slate-400">Montmartre · Paris 18e</span>
        </span>
      </div>
    </div>
  );
}
