import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/components/ui/cn";

/** Table that scrolls horizontally inside its panel on small screens. */
export function DataTable({
  caption,
  minWidth = 760,
  children,
  className,
}: {
  caption: string;
  minWidth?: number;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("panel overflow-hidden rounded-2xl", className)}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm" style={{ minWidth }}>
          <caption className="sr-only">{caption}</caption>
          {children}
        </table>
      </div>
    </div>
  );
}

export function Th({ className, ...props }: ComponentProps<"th">) {
  return (
    <th
      scope="col"
      className={cn(
        "border-b border-white/8 bg-white/[0.02] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400",
        className,
      )}
      {...props}
    />
  );
}

export function Td({ className, ...props }: ComponentProps<"td">) {
  return <td className={cn("border-b border-white/5 px-4 py-3 align-top text-slate-300", className)} {...props} />;
}

export function Tr({ className, ...props }: ComponentProps<"tr">) {
  return <tr className={cn("transition-colors hover:bg-white/[0.025]", className)} {...props} />;
}
