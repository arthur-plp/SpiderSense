import { ArrowUpRight, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/components/ui/cn";
import { formatNumber } from "@/lib/format";

/** A moderation queue on the overview: count + link, highlighted when not empty. */
export function QueueCard({ href, label, count, icon: Icon, hint }: { href: string; label: string; count: number; icon: LucideIcon; hint: string }) {
  const pending = count > 0;
  return (
    <Link
      href={href}
      className={cn(
        "group panel flex items-start gap-3 rounded-2xl p-4 transition-colors hover:border-sky-300/40",
        pending && "border-amber-300/30",
      )}
    >
      <span
        className={cn(
          "inline-flex size-10 shrink-0 items-center justify-center rounded-xl",
          pending ? "bg-amber-400/12 text-amber-300" : "bg-white/5 text-slate-500",
        )}
      >
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span className={cn("text-2xl font-bold tabular-nums", pending ? "text-white" : "text-slate-500")}>{formatNumber(count)}</span>
          <ArrowUpRight className="size-4 text-slate-600 transition-colors group-hover:text-sky-300" aria-hidden />
        </span>
        <span className="block text-sm font-medium text-slate-200">{label}</span>
        <span className="block text-xs text-slate-500">{hint}</span>
      </span>
    </Link>
  );
}
