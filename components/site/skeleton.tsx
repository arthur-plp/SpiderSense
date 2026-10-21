import type { ReactNode } from "react";
import { cn } from "@/components/ui/cn";

/** `rounded` is a separate prop: `cn` only joins classes, so two radius classes would conflict. */
export function Skeleton({ className, rounded = "rounded-xl" }: { className?: string; rounded?: string }) {
  return <div aria-hidden className={cn("animate-pulse bg-white/6", rounded, className)} />;
}

/** Suspense fallback wrapper that announces the loading state to screen readers. */
export function Loading({ label = "Chargement…", className, children }: { label?: string; className?: string; children: ReactNode }) {
  return (
    <div role="status" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

export function FormSkeleton({ fields = 2, className }: { fields?: number; className?: string }) {
  return (
    <Loading className={cn("space-y-5", className)}>
      {Array.from({ length: fields }, (_, index) => (
        <div key={index} className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-11" />
        </div>
      ))}
      <Skeleton className="h-12" rounded="rounded-2xl" />
    </Loading>
  );
}

export function CardGridSkeleton({
  count = 3,
  grid = "grid gap-5 sm:grid-cols-2 lg:grid-cols-3",
  className,
  cardClassName = "h-64",
}: {
  count?: number;
  /** Grid layout classes, replacing the default three-column grid. */
  grid?: string;
  className?: string;
  /** Card size classes, replacing the default height. */
  cardClassName?: string;
}) {
  return (
    <Loading className={cn(grid, className)}>
      {Array.from({ length: count }, (_, index) => (
        <Skeleton key={index} className={cardClassName} rounded="rounded-3xl" />
      ))}
    </Loading>
  );
}
