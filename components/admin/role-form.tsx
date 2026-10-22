"use client";

import { FormMessage, Select } from "@/components/ui/form";
import type { ApiEndpoint } from "@/lib/api-client";
import { ROLE_LABELS, type Role } from "@/lib/labels";
import { useApiForm } from "@/lib/use-api-form";
import { ConfirmSubmit } from "./confirm-submit";

/** Promote / demote an account (administrators only). */
export function RoleForm({
  endpoint,
  role,
  roles,
  userName,
}: {
  endpoint: ApiEndpoint;
  role: Role;
  roles: Role[];
  userName: string;
}) {
  const [state, formAction] = useApiForm(endpoint);
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex min-w-48 flex-1 flex-col gap-1.5">
          <label htmlFor="role" className="text-sm font-medium text-slate-200">
            Rôle
          </label>
          <Select name="role" defaultValue={role}>
            {roles.map((value) => (
              <option key={value} value={value}>
                {ROLE_LABELS[value]}
              </option>
            ))}
          </Select>
        </div>
        <ConfirmSubmit
          title="Changer le rôle ?"
          description={`Les droits de ${userName} changent immédiatement. Modérateurs et administrateurs accèdent au dashboard et aux données personnelles des utilisateurs.`}
          confirmLabel="Changer le rôle"
          variant="primary"
          size="md"
        >
          Appliquer
        </ConfirmSubmit>
      </div>
      <FormMessage state={state} />
    </form>
  );
}
