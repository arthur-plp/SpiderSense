"use client";

import { type ReactNode, useActionState } from "react";
import type { ButtonVariant } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { type ActionState, idleState } from "@/lib/action-state";

/**
 * A single confirmation button for links received by email (activation,
 * unsubscribe): the action only runs on a click, never on page load.
 */
export function ConfirmActionForm({
  action,
  label,
  pendingLabel,
  icon,
  variant = "primary",
  successContent,
  errorContent,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  label: string;
  pendingLabel: string;
  icon?: ReactNode;
  variant?: ButtonVariant;
  successContent?: ReactNode;
  errorContent?: ReactNode;
}) {
  const [state, formAction] = useActionState(action, idleState);

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
