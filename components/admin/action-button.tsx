"use client";

import type { ReactNode } from "react";
import type { ButtonSize, ButtonVariant } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ApiEndpoint } from "@/lib/api-client";
import { useApiForm } from "@/lib/use-api-form";
import { ConfirmSubmit } from "./confirm-submit";

type ActionButtonProps = {
  /** The REST call made on click, ids included in the path. */
  endpoint: ApiEndpoint;
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  pendingLabel?: string;
  /** Asks for confirmation in a dialog before running a destructive action. */
  confirm?: { title: string; description?: ReactNode; confirmLabel?: string };
  /** Shows the success message next to the button (errors are always shown). */
  showSuccess?: boolean;
};

/** One-click moderation action (approve, hide, disable…) with inline feedback. */
export function ActionButton({
  endpoint,
  children,
  variant = "secondary",
  size = "sm",
  className,
  pendingLabel,
  confirm,
  showSuccess = false,
}: ActionButtonProps) {
  const [state, formAction] = useApiForm(endpoint);
  const showMessage = state.message && (state.status === "error" || showSuccess);
  return (
    <form action={formAction} className="inline-flex flex-col items-start gap-1">
      {confirm ? (
        <ConfirmSubmit
          title={confirm.title}
          description={confirm.description}
          confirmLabel={confirm.confirmLabel}
          variant={variant}
          size={size}
          className={className}
        >
          {children}
        </ConfirmSubmit>
      ) : (
        <SubmitButton variant={variant} size={size} className={className} pendingLabel={pendingLabel}>
          {children}
        </SubmitButton>
      )}
      {showMessage && (
        <p
          role={state.status === "error" ? "alert" : "status"}
          className={cn("max-w-xs text-xs", state.status === "error" ? "text-rose-300" : "text-emerald-300")}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
