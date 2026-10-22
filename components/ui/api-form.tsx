"use client";

import type { ReactNode } from "react";
import type { ApiEndpoint } from "@/lib/api-client";
import { useApiForm } from "@/lib/use-api-form";

/**
 * A form that calls a REST endpoint, for server components (sign out, remove a
 * movie…): put a SubmitButton inside. Errors are shown under the form.
 */
export function ApiForm({ endpoint, children, className }: { endpoint: ApiEndpoint; children: ReactNode; className?: string }) {
  const [state, action] = useApiForm(endpoint);
  return (
    <form action={action} className={className}>
      {children}
      {state.status === "error" && state.message && (
        <p role="alert" className="mt-1 text-xs text-rose-300">
          {state.message}
        </p>
      )}
    </form>
  );
}
