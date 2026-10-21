"use client";

import Form from "next/form";
import type { ReactNode } from "react";
import { cn } from "@/components/ui/cn";

/**
 * GET form that updates the URL search params. Selects and checkboxes apply
 * immediately; text fields on Enter (or with the submit button without JS).
 */
export function FilterForm({ action, children, className }: { action: string; children: ReactNode; className?: string }) {
  return (
    <Form
      action={action}
      role="search"
      className={cn("panel flex flex-wrap items-end gap-3 rounded-2xl p-3 sm:p-4", className)}
      onChange={(event) => {
        const target = event.target as HTMLElement;
        if (target instanceof HTMLSelectElement || (target instanceof HTMLInputElement && target.type === "checkbox")) {
          event.currentTarget.requestSubmit();
        }
      }}
    >
      {children}
    </Form>
  );
}

/** Compact label + control for a filter bar. */
export function FilterField({ label, htmlFor, children, className }: { label: string; htmlFor: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex min-w-36 flex-1 flex-col gap-1 sm:flex-none", className)}>
      <label htmlFor={htmlFor} className="text-xs font-medium text-slate-400">
        {label}
      </label>
      {children}
    </div>
  );
}
