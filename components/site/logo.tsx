import { useId } from "react";
import { cn } from "@/components/ui/cn";

/** Shield emblem with a gold bolt, followed by the "Heros" wordmark and the red SOS pill. */
export function Logo({ className, withWordmark = true }: { className?: string; withWordmark?: boolean }) {
  // Unique gradient ids: the logo appears several times on a page.
  const id = useId();
  const fillId = `${id}-fill`;
  const shineId = `${id}-shine`;
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg
        viewBox="0 0 40 44"
        className="h-8 w-auto shrink-0 drop-shadow-[0_6px_14px_rgb(56_189_248/0.45)]"
        aria-hidden
        focusable="false"
      >
        <defs>
          <linearGradient id={fillId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#7dd3fc" />
            <stop offset="0.45" stopColor="#38bdf8" />
            <stop offset="1" stopColor="#1d4ed8" />
          </linearGradient>
          <linearGradient id={shineId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.35" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d="M20 2 36 8v13c0 10-7 17.5-16 21C11 38.5 4 31 4 21V8l16-6Z"
          fill={`url(#${fillId})`}
          stroke="#e0f2fe"
          strokeOpacity="0.45"
          strokeWidth="1.2"
        />
        <path d="M20 2 4 8v13c0 10 7 17.5 16 21V2Z" fill={`url(#${shineId})`} opacity="0.55" />
        <path d="M23 9.5 13.5 24.2h6.2L17.6 34.5 27.4 19.6h-6.3L23 9.5Z" fill="#f5b82e" stroke="#7c4a03" strokeOpacity="0.35" strokeWidth="0.6" />
      </svg>
      {withWordmark && (
        <span className="flex items-center gap-1.5 text-lg font-extrabold tracking-tight text-white">
          Heros
          <span className="rounded-full bg-sos px-2 py-0.5 text-[0.68rem] font-black leading-4 tracking-[0.14em] text-white shadow-[0_0_18px_-2px_rgb(255_61_90/0.85)]">
            SOS
          </span>
        </span>
      )}
    </span>
  );
}
