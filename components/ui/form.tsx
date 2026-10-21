import type { ComponentProps, ReactNode } from "react";
import type { ActionState } from "@/lib/action-state";
import { cn } from "./cn";

type FieldProps = {
  label: ReactNode;
  name: string;
  errors?: string[];
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
};

/** Label + control + error/hint, wired with aria-describedby. */
export function Field({ label, name, errors, hint, className, children }: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={name} className="text-sm font-medium text-slate-200">
        {label}
      </label>
      {children}
      {errors?.length ? (
        <p id={`${name}-error`} className="text-xs font-medium text-rose-300">
          {errors[0]}
        </p>
      ) : hint ? (
        <p id={`${name}-hint`} className="text-xs text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

type ControlExtras = { invalid?: boolean };

const describedBy = (name: string | undefined, invalid?: boolean) =>
  name ? (invalid ? `${name}-error` : `${name}-hint`) : undefined;

export function Input({ className, invalid, name, ...props }: ComponentProps<"input"> & ControlExtras) {
  return (
    <input
      id={name}
      name={name}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy(name, invalid)}
      className={cn("field", className)}
      {...props}
    />
  );
}

export function Textarea({ className, invalid, name, ...props }: ComponentProps<"textarea"> & ControlExtras) {
  return (
    <textarea
      id={name}
      name={name}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy(name, invalid)}
      className={cn("field min-h-24 resize-y", className)}
      {...props}
    />
  );
}

export function Select({ className, invalid, name, ...props }: ComponentProps<"select"> & ControlExtras) {
  return (
    <select
      id={name}
      name={name}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy(name, invalid)}
      className={cn("field appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%2394a3b8%22 stroke-width=%222%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[length:14px] bg-[right_0.8rem_center] bg-no-repeat pr-9", className)}
      {...props}
    />
  );
}

export function Checkbox({ label, className, ...props }: ComponentProps<"input"> & { label: ReactNode }) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-2.5 text-sm text-slate-300", className)}>
      <input type="checkbox" className="mt-0.5 size-4 shrink-0 accent-sky-400" {...props} />
      <span>{label}</span>
    </label>
  );
}

/** Global message of a form action (success or error). */
export function FormMessage({ state, className }: { state: ActionState; className?: string }) {
  if (!state.message) return null;
  const success = state.status === "success";
  return (
    <p
      role={success ? "status" : "alert"}
      className={cn(
        "rounded-xl border px-3.5 py-2.5 text-sm",
        success ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200" : "border-rose-400/30 bg-rose-500/10 text-rose-200",
        className,
      )}
    >
      {state.message}
    </p>
  );
}
