import type { ReactNode } from "react";
import { cn } from "@/components/ui/cn";

/** Eyebrow + h2 + description, used by the home page sections. */
export function SectionHeading({
  id,
  eyebrow,
  title,
  description,
  action,
  align = "left",
  className,
}: {
  id?: string;
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  align?: "left" | "center";
  className?: string;
}) {
  const centered = align === "center";
  return (
    <div className={cn(centered ? "flex flex-col items-center gap-4 text-center" : "flex flex-wrap items-end justify-between gap-4", className)}>
      <div className={cn("max-w-2xl", centered && "mx-auto")}>
        {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-300/90">{eyebrow}</p>}
        <h2 id={id} className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
          {title}
        </h2>
        {description && <p className="mt-3 text-sm leading-relaxed text-slate-400 sm:text-base">{description}</p>}
      </div>
      {action}
    </div>
  );
}
