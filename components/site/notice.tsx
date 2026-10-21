import { CircleAlert, CircleCheck, Info, type LucideIcon, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/components/ui/cn";

type NoticeTone = "success" | "info" | "warning" | "error";

const TONES: Record<NoticeTone, { icon: LucideIcon; className: string }> = {
  success: { icon: CircleCheck, className: "border-emerald-400/30 bg-emerald-400/10 text-emerald-100" },
  info: { icon: Info, className: "border-sky-300/25 bg-sky-400/10 text-sky-100" },
  warning: { icon: TriangleAlert, className: "border-amber-300/30 bg-amber-300/10 text-amber-100" },
  error: { icon: CircleAlert, className: "border-rose-400/30 bg-rose-500/10 text-rose-100" },
};

/** Inline banner (account activated, link expired…). */
export function Notice({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: NoticeTone;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const { icon: Icon, className: toneClass } = TONES[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("flex gap-3 rounded-2xl border px-4 py-3 text-sm", toneClass, className)}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0 space-y-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="leading-relaxed opacity-90">{children}</div>}
      </div>
    </div>
  );
}
