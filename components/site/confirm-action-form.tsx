"use client";

import type { ReactNode } from "react";
import type { ButtonVariant } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ApiEndpoint } from "@/lib/api-client";
import { useApiForm } from "@/lib/use-api-form";

/**
 * A single confirmation button for links received by email (activation,
 * unsubscribe): the action only runs on a click, never on page load.
 */
export function ConfirmActionForm({
  endpoint,
  label,
  pendingLabel,
  icon,
  variant = "primary",
  successContent,
  errorContent,
}: {
  endpoint: ApiEndpoint;
  label: string;
  pendingLabel: string;
  icon?: ReactNode;
  variant?: ButtonVariant;
  successContent?: ReactNode;
  errorContent?: ReactNode;
}) {
  const [state, formAction] = useApiForm(endpoint);

  if (state.status !== "idle") {
    return (
      <div className="space-y-5">
        <FormMessage state={state} />
        {state.status === "success" ? successContent : errorContent}
      </div>
    );
  }

  return (
    <form action={formAction}>
      <SubmitButton size="lg" variant={variant} className="w-full" pendingLabel={pendingLabel}>
        {icon}
        {label}
      </SubmitButton>
    </form>
  );
}
