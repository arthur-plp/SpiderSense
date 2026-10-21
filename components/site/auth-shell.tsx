import type { ReactNode } from "react";
import { cn } from "@/components/ui/cn";
import { Container } from "./container";

/** Centered card used by the login, sign-up and account-recovery pages. */
export function AuthShell({
  icon,
  title,
  description,
  children,
  footer,
  wide = false,
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  return (
    <Container className="flex flex-1 justify-center py-10 sm:py-16">
      <div className={cn("w-full animate-slide-up", wide ? "max-w-3xl" : "max-w-md")}>
        <div className="mb-7 text-center">
          {icon && (
            <span className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-sky-400/10 text-sky-300 shadow-[0_0_40px_-8px_rgb(56_189_248/0.6)] ring-1 ring-sky-300/25">
              {icon}
            </span>
          )}
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{title}</h1>
          {description && <div className="mx-auto mt-2 max-w-prose text-sm leading-relaxed text-slate-400">{description}</div>}
        </div>
        <div className="glass glass-strong rounded-3xl p-5 sm:p-8">{children}</div>
        {footer && <div className="mt-6 text-center text-sm text-slate-400">{footer}</div>}
      </div>
    </Container>
  );
}

/** Inline text link styled for the auth pages. */
export const authLinkClass = "font-semibold text-sky-300 underline-offset-2 hover:text-sky-200 hover:underline";
