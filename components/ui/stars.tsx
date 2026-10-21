import { Star } from "lucide-react";
import { formatRating } from "@/lib/format";
import { cn } from "./cn";

/** Read-only rating out of 5, with an accessible label. */
export function Stars({ value, count, size = 14, className }: { value: number | null; count?: number; size?: number; className?: string }) {
  const rounded = value === null ? 0 : Math.round(value * 2) / 2;
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <span className="inline-flex" role="img" aria-label={value === null ? "Pas encore noté" : `Note : ${formatRating(value)} sur 5`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <span key={star} className="relative" style={{ width: size, height: size }}>
            <Star size={size} className="absolute inset-0 text-slate-600" strokeWidth={1.5} />
            {rounded >= star - 0.5 && (
              <span className="absolute inset-0 overflow-hidden" style={{ width: rounded >= star ? size : size / 2 }}>
                <Star size={size} className="fill-brand text-brand" strokeWidth={1.5} />
              </span>
            )}
          </span>
        ))}
      </span>
      <span className="text-xs font-semibold text-slate-200">{formatRating(value)}</span>
      {count !== undefined && <span className="text-xs text-slate-400">({count})</span>}
    </span>
  );
}
