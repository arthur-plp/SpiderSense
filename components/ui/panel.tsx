import type { ComponentProps, ReactNode } from "react";
import { cn } from "./cn";

export function Panel({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("panel rounded-2xl", className)} {...props} />;
}

export function GlassCard({ className, active, ...props }: ComponentProps<"div"> & { active?: boolean }) {
  return <div className={cn("glass rounded-2xl", active && "glass-active", className)} {...props} />;
}

export function SectionTitle({ children, action, className }: { children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("mb-3 flex items-center justify-between gap-3", className)}>
      <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">{children}</h2>
      {action}
    </div>
  );
}

export function PageHeader({ title, description, actions, eyebrow }: { title: string; description?: ReactNode; actions?: ReactNode; eyebrow?: string }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-sky-300/80">{eyebrow}</p>}
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm text-slate-400">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function EmptyState({ icon, title, children, className }: { icon?: ReactNode; title: string; children?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-400/20 px-6 py-10 text-center", className)}>
      {icon && <div className="mb-3 text-slate-500">{icon}</div>}
      <p className="font-semibold text-slate-200">{title}</p>
      {children && <div className="mt-1 max-w-sm text-sm text-slate-400">{children}</div>}
    </div>
  );
}

export function StatTile({ label, value, hint, icon, className }: { label: string; value: ReactNode; hint?: ReactNode; icon?: ReactNode; className?: string }) {
  return (
    <div className={cn("panel rounded-2xl p-4", className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-slate-400">{label}</p>
        {icon && <span className="text-sky-300/80">{icon}</span>}
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight text-white">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
