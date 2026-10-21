"use client";

import { Star } from "lucide-react";
import { useState } from "react";
import { cn } from "./cn";

const LABELS = ["Très insatisfait", "Insatisfait", "Correct", "Satisfait", "Excellent"];

/** Accessible 1–5 rating input (radio group) posting `name`. */
export function StarInput({ name, defaultValue = 0, size = 34 }: { name: string; defaultValue?: number; size?: number }) {
  const [value, setValue] = useState(defaultValue);
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <fieldset>
      <legend className="sr-only">Note sur 5</legend>
      <div className="flex items-center gap-1.5" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((star) => (
          <label key={star} className="cursor-pointer" onMouseEnter={() => setHover(star)}>
            <input
              type="radio"
              name={name}
              value={star}
              checked={value === star}
              onChange={() => setValue(star)}
              className="peer sr-only"
              required
            />
            <Star
              size={size}
              strokeWidth={1.4}
              className={cn(
                "rounded transition-transform peer-focus-visible:outline-2 peer-focus-visible:outline-sky-400 hover:scale-110",
                star <= shown ? "fill-brand text-brand" : "text-slate-600",
              )}
            />
            <span className="sr-only">{LABELS[star - 1]}</span>
          </label>
        ))}
      </div>
      <p className="mt-1.5 h-5 text-sm text-slate-400" aria-live="polite">
        {shown ? LABELS[shown - 1] : "Touchez une étoile"}
      </p>
    </fieldset>
  );
}
