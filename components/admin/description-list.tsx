import type { ReactNode } from "react";
import { cn } from "@/components/ui/cn";

export type DescriptionItem = { label: string; value: ReactNode; className?: string };

/** Label / value pairs of a profile or an incident; empty values show a dash. */
export function DescriptionList({ items, className }: { items: DescriptionItem[]; className?: string }) {
  return (
    <dl className={cn("grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2", className)}>
      {items.map((item) => (
        <div key={item.label} className={cn("min-w-0", item.className)}>
          <dt className="text-xs font-medium text-slate-500">{item.label}</dt>
          <dd className="mt-0.5 break-words text-sm text-slate-200">
            {item.value === null || item.value === undefined || item.value === "" ? (
              <span className="text-slate-500">—</span>
            ) : (
              item.value
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
