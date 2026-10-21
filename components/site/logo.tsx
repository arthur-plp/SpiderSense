import { useId } from "react";
import { cn } from "@/components/ui/cn";

// Spider-sense waves around the mask: start point and angle of a short wavy stroke.
const SENSE_WAVES = [
  { x: 24, y: 1.5, angle: 90 },
  { x: 10, y: 4.5, angle: 50 },
  { x: 38, y: 4.5, angle: 130 },
  { x: 2, y: 19, angle: 10 },
  { x: 46, y: 19, angle: 170 },
  { x: 3, y: 33.5, angle: -15 },
  { x: 45, y: 33.5, angle: 195 },
];
const wavePath = ({ x, y }: { x: number; y: number }) => `M${x} ${y}q1.2-1.7 2.4 0t2.4 0t2.4 0`;

const HEAD = "M24 12.5c6.6 0 10.8 5.6 10.8 12.6C34.8 33.4 29.6 41 24 41s-10.8-7.6-10.8-15.9c0-7 4.2-12.6 10.8-12.6Z";

/** Spider mask surrounded by spider-sense waves, followed by the "Spider" wordmark and the red SENSE pill. */
export function Logo({ className, withWordmark = true }: { className?: string; withWordmark?: boolean }) {
  // Unique ids: the logo appears several times on a page.
  const id = useId();
  const fillId = `${id}-fill`;
  const dotsId = `${id}-dots`;
  const clipId = `${id}-clip`;
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg
        viewBox="0 0 48 43"
        className="h-9 w-auto shrink-0 drop-shadow-[0_6px_14px_rgb(255_61_90/0.45)]"
        aria-hidden
        focusable="false"
      >
        <defs>
          <linearGradient id={fillId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ff5a7a" />
            <stop offset="0.55" stopColor="#e11d48" />
            <stop offset="1" stopColor="#9f1239" />
          </linearGradient>
          <pattern id={dotsId} width="2.4" height="2.4" patternUnits="userSpaceOnUse">
            <circle cx="1.2" cy="1.2" r="0.45" fill="#ffffff" fillOpacity="0.22" />
          </pattern>
          <clipPath id={clipId}>
            <path d={HEAD} />
          </clipPath>
        </defs>

        <g fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6">
          {SENSE_WAVES.map((w) => (
            <path
              key={`c${w.angle}`}
              d={wavePath(w)}
              stroke="#38bdf8"
              strokeOpacity="0.8"
              transform={`translate(0.7 0.7) rotate(${w.angle} ${w.x} ${w.y})`}
            />
          ))}
          {SENSE_WAVES.map((w) => (
            <path key={`m${w.angle}`} d={wavePath(w)} stroke="#ec4899" transform={`rotate(${w.angle} ${w.x} ${w.y})`} />
          ))}
        </g>

        {/* Mask: cyan offset, red fill, halftone dots, web lines. */}
        <path d={HEAD} fill="#7dd3fc" fillOpacity="0.55" transform="translate(1.2 0.6)" />
        <path d={HEAD} fill={`url(#${fillId})`} />
        <path d={HEAD} fill={`url(#${dotsId})`} />
        <g clipPath={`url(#${clipId})`} fill="none" stroke="#4c0519" strokeOpacity="0.55" strokeWidth="0.6">
          <path d="M24 12v30M13 18.5q11-3.5 22 0M12.5 25.5q11.5-3.5 23 0M13 33q11-3 22 0M15 39.5q9-2.5 18 0" />
          <path d="M24 28 13 15M24 28l11-13M24 28 12 34M24 28l12 6" />
        </g>

        {/* Eyes */}
        <g stroke="#0f172a" strokeWidth="1.1" strokeLinejoin="round" fill="#f0f9ff">
          <path d="M22.4 28c-1.2-4.2-5.4-7-8.2-6-.8 3 1.8 7.4 8.2 6Z" />
          <path d="M25.6 28c1.2-4.2 5.4-7 8.2-6 .8 3-1.8 7.4-8.2 6Z" />
        </g>
      </svg>
      {withWordmark && (
        <span className="flex items-center gap-1.5 text-lg font-extrabold tracking-tight text-white">
          Spider
          <span className="rounded-full bg-sos px-2 py-0.5 text-[0.68rem] font-black leading-4 tracking-[0.14em] text-white shadow-[0_0_18px_-2px_rgb(255_61_90/0.85)]">
            SENSE
          </span>
        </span>
      )}
    </span>
  );
}
