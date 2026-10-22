"use client";

import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { type ActionState, idleState } from "./action-state";
import { type ApiEndpoint, type ApiResult, fillPath, submitEndpoint } from "./api-client";

/**
 * useActionState for a REST endpoint: submits the form fields as JSON, then
 * opens `redirectTo` or refreshes the server components on success.
 */
export function useApiForm(
  endpoint: ApiEndpoint,
  onSuccess?: (data: Extract<ApiResult, { ok: true }>["data"]) => void,
) {
  const router = useRouter();
  return useActionState(async (_: ActionState, formData: FormData): Promise<ActionState> => {
    const { state, result } = await submitEndpoint(endpoint, formData);
    if (result.ok) {
      onSuccess?.(result.data);
      const target = endpoint.redirectTo ? fillPath(endpoint.redirectTo, result.data) : null;
      if (endpoint.fullReload) window.location.assign(target ?? window.location.href);
      else if (target) router.push(target);
      else router.refresh();
    }
    return state;
  }, idleState);
}
