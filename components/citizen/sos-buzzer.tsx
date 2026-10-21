"use client";

import { useState } from "react";
import { cn } from "@/components/ui/cn";

/**
 * The big SOS button: idle pulse rings, a shockwave and haptic tick on press.
 * It never sends anything by itself; it opens the confirmation step.
 */
export function SosBuzzer({ onPress, alertActive }: { onPress: () => void; alertActive: boolean }) {
  const [shock, setShock] = useState(0);
  return (
    <div className="relative flex size-60 items-center justify-center">
      {[0, 0.8, 1.6].map((delay) => (
        <span
          key={delay}
          aria-hidden
          className="absolute size-40 rounded-full border-2 border-sos/70 animate-sos-ring"
          style={{ animationDelay: `${delay}s` }}
        />
      ))}
      {shock > 0 && (
        <span
          key={shock}
          aria-hidden
          className="absolute size-40 rounded-full bg-sos/40 [animation:sos-ring_0.7s_ease-out_forwards]"
        />
      )}
      <button
        type="button"
        onClick={() => {
          setShock((value) => value + 1);
          navigator.vibrate?.([40, 30, 60]);
          onPress();
        }}
        aria-haspopup="dialog"
        aria-describedby="sos-hint"
        className={cn(
          "group relative flex size-40 flex-col items-center justify-center rounded-full text-white transition-transform duration-150 active:scale-[0.93]",
          "bg-[radial-gradient(circle_at_35%_28%,#ff8fa1_0%,#ff3d5a_42%,#c0102e_78%,#8c0a22_100%)]",
          "shadow-[0_0_70px_-6px_rgb(255_61_90/0.9),inset_0_-14px_28px_rgb(0_0_0/0.35),inset_0_10px_22px_rgb(255_255_255/0.35)]",
          "ring-4 ring-white/10 focus-visible:ring-white/60",
        )}
      >
        <span className="text-[44px] font-black leading-none tracking-[0.12em] drop-shadow-[0_2px_6px_rgb(0_0_0/0.4)]">SOS</span>
        <span className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white/90">
          {alertActive ? "Nouvelle alerte" : "Appeler un héros"}
        </span>
      </button>
      <p id="sos-hint" className="sr-only">
        Ouvre une confirmation avant d&apos;envoyer l&apos;alerte aux super-héros.
      </p>
    </div>
  );
}
