import { initials } from "@/lib/format";
import { cn } from "./cn";

const gradients = [
  "from-sky-500 to-indigo-600",
  "from-rose-500 to-orange-500",
  "from-emerald-500 to-teal-600",
  "from-amber-400 to-rose-500",
  "from-violet-500 to-fuchsia-600",
  "from-cyan-400 to-blue-600",
];

function gradientFor(label: string) {
  let hash = 0;
  for (const char of label) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return gradients[Math.abs(hash) % gradients.length];
}

/** Uploaded picture, or initials on a gradient derived from the name. */
export function Avatar({ src, label, size = 40, className }: { src?: string | null; label: string; size?: number; className?: string }) {
  const style = { width: size, height: size, fontSize: Math.max(11, size * 0.36) };
  if (src) {
    return (
      // Avatars come from our own API route with a cache-busting query string.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt="" style={style} className={cn("shrink-0 rounded-full object-cover ring-1 ring-white/15", className)} />
    );
  }
  return (
    <span
      aria-hidden
      style={style}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-bold text-white ring-1 ring-white/15",
        gradientFor(label),
        className,
      )}
    >
      {initials(label)}
    </span>
  );
}
